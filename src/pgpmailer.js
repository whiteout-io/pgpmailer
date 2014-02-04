'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var openpgp = require('openpgp'),
        Mailbuilder = require('mailbuilder'),
        simplesmtp = require('simplesmtp'),
        PgpMailer;

    /**
     * Constructor for the high level api. Will fire up the SMTP connection as soon as it is invoked.
     * NB! The constructor will invoke options.onError and return undefined if there is an error while decrypting the private key.
     * @param {Number} options.port Port is the port to the server (defaults to 25 on non-secure and to 465 on secure connection).
     * @param {String} options.host Hostname of the server.
     * @param {String} options.auth.user Username for login
     * @param {String} options.auth.pass Password for login
     * @param {Boolean} options.secureConnection Indicates if the connection is using TLS or not
     * @param {String} options.tls Further optional object for tls.connect, e.g. { ca: 'PIN YOUR CA HERE' }
     * @param {String} options.onError Top-level error handler with information if an error occurred
     */
    PgpMailer = function(options, pgp, smtp) {
        this._queue = [];
        this._busy = true;
        this._current = undefined;

        this._pgp = pgp || openpgp;
        this._smtp = (smtp || simplesmtp).connect(options.port, options.host, options);

        var ready = function() {
            this._smtp.removeAllListeners('message');
            this._smtp.removeAllListeners('rcptFailed');
            this._smtp.removeAllListeners('ready');
            this._busy = false;
            this._processQueue();
        };

        // ready, waiting for an envelope
        this._smtp.on('idle', ready.bind(this));
        this._smtp.on('error', options.onError);
    };

    /**
     * Set the private key used to sign your messages
     * @param {String} options.privateKey ASCII-armored private key to sign the messages
     * @param {String} options.passphrase The passphrase to encrypt options.armoredPrivateKey
     * @param {Function} callback(error) Indicates that the private key has been set, or provides error information
     */
    PgpMailer.prototype.setPrivateKey = function(options, callback) {
        var privateKey;

        try {
            // decrypt the private key (for signing)
            privateKey = openpgp.key.readArmored(options.privateKeyArmored).keys[0];
            if (!privateKey.decrypt(options.passphrase)) {
                callback(new Error('Wrong passphrase! Could not decrypt the private key!'));
                return;
            }
        } catch (err) {
            callback(err);
            return;
        }

        this._privateKey = privateKey;
        callback();
    };

    /**
     * Queues a mail object for sending.
     * @param {Object} options.cleartextMessage A clear text message in addition to the encrypted message
     * @param {Object} options.mail.from Array containing one object with the ASCII string representing the sender address, e.g. 'foo@bar.io'
     * @param {Array} options.mail.to Array of objects with the ASCII string representing the recipient (e.g. ['the.dude@lebowski.com', 'donny@kerabatsos.com'])
     * @param {Object} options.mail.cc Array of objects with the ASCII string representing the recipient, see mail.to
     * @param {Object} options.mail.bcc Array of objects with the ASCII string representing the recipient, see mail.to
     * @param {Array} options.mail.publicKeys The public keys with which the message should be encrypted
     * @param {String} options.mail.subject String containing with the mail's subject
     * @param {String} options.mail.body Plain text body to be sent with the mail
     * @param {Array} options.mail.attachments Array of attachment objects with fileName {String}, uint8Array {Uint8Array}, and contentType {String}
     * @param {Array} options.publicKeysArmored The public keys with which the message should be encrypted
     * @param {Function} callback(error) Indicates that the mail has been sent, or gives information in case an error occurred.
     */
    PgpMailer.prototype.send = function(options, callback, builder) {
        if (!this._privateKey) {
            callback(new Error('No private key has been set. Cannot sign mails!'));
            return;
        }

        this._queue.push({
            builder: builder || new Mailbuilder(),
            mail: options.mail,
            cleartextMessage: options.cleartextMessage,
            publicKeysArmored: options.publicKeysArmored,
            callback: callback
        });

        this._processQueue();
    };

    PgpMailer.prototype._processQueue = function() {
        if (this._busy || this._queue.length === 0) {
            return;
        }

        this._current = this._queue.shift();

        this._createMimeTree();
        this._encrypt();
        this._send();
    };

    PgpMailer.prototype._createMimeTree = function() {
        var mail = this._current.mail,
            builder = this._current.builder,
            parentNode, contentNode, signatureNode,
            cleartext, signedCleartext, signatureHeader;


        // 
        // create the envelope data
        // 

        builder.setSubject(mail.subject);

        // add everyone's addresses
        builder.setFrom(mail.from[0].address || mail.from[0]);

        if (mail.to) {
            mail.to.forEach(function(recipient) {
                builder.addTo(recipient.address || recipient);
            });
        }

        if (mail.cc) {
            mail.cc.forEach(function(recipient) {
                builder.addCc(recipient.address || recipient);
            });
        }

        if (mail.bcc) {
            mail.bcc.forEach(function(recipient) {
                builder.addBcc(recipient.address || recipient);
            });
        }


        // 
        // create the mime tree
        // 

        parentNode = builder.createNode([{
            key: 'Content-Type',
            value: 'multipart/signed',
            parameters: {
                micalg: 'pgp-sha256',
                protocol: 'application/pgp-signature'
            }
        }]);

        // this a plain text mail? then only one text/plain node is needed
        if (!mail.attachments || mail.attachments.length === 0) {
            contentNode = parentNode.createNode([{
                key: 'Content-Type',
                value: 'text/plain',
                parameters: {
                    charset: 'utf-8'
                }
            }, {
                key: 'Content-Transfer-Encoding',
                value: 'quoted-printable'
            }]);
            contentNode.content = mail.body;
        } else {
            // we have attachments, so let's create a multipart/mixed mail
            contentNode = parentNode.createNode([{
                key: 'Content-Type',
                value: 'multipart/mixed',
            }]);

            // create the text/plain node
            contentNode.createNode([{
                key: 'Content-Type',
                value: 'text/plain',
                parameters: {
                    charset: 'utf-8'
                }
            }, {
                key: 'Content-Transfer-Encoding',
                value: 'quoted-printable'
            }]).content = mail.body;

            // add the attachments
            mail.attachments.forEach(function(attmt) {
                contentNode.createNode([{
                    key: 'Content-Type',
                    value: attmt.contentType || 'application/octet-stream'
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'base64'
                }, {
                    key: 'Content-Disposition',
                    value: 'attachment',
                    parameters: {
                        filename: attmt.fileName
                    }
                }]).content = arr2str(attmt.uint8Array);
            });
        }

        //
        // Sign the whole thing
        //

        signatureNode = parentNode.createNode([{
            key: 'Content-Type',
            value: 'application/pgp-signature'
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }]);

        cleartext = contentNode.build().trim() + '\r\n';
        openpgp.config.prefer_hash_algorithm = openpgp.enums.hash.sha256;
        signedCleartext = openpgp.signClearMessage([this._privateKey], cleartext);
        signatureHeader = "-----BEGIN PGP SIGNATURE-----";
        signatureNode.content = signatureHeader + signedCleartext.split(signatureHeader).pop();
    };

    PgpMailer.prototype._encrypt = function() {
        var builder = this._current.builder,
            callback = this._current.callback,
            cleartextMessage = this._current.cleartextMessage,
            publicKeysArmored = this._current.publicKeysArmored,
            publicKeys = [],
            plaintext, ciphertext,
            multipartParentNode, encryptedNode;

        // prepare the plain text mime nodes
        plaintext = builder.node.build();

        try {
            // parse the ASCII-armored public keys
            publicKeysArmored.forEach(function(key) {
                publicKeys.push(openpgp.key.readArmored(key).keys[0]);
            });

            // encrypt the plain text
            ciphertext = openpgp.signAndEncryptMessage(publicKeys, this._privateKey, plaintext);
        } catch (err) {
            callback(err);
            return;
        }

        // delete the plain text from the builder
        delete builder.node;

        // do we need to frame the encrypted message with a clear text?
        if (cleartextMessage) {
            // create a multipart/mixed message
            multipartParentNode = builder.createNode([{
                key: 'Content-Type',
                value: 'multipart/mixed',
            }]);

            multipartParentNode.createNode([{
                key: 'Content-Type',
                value: 'text/plain',
                parameters: {
                    charset: 'utf-8'
                }
            }, {
                key: 'Content-Transfer-Encoding',
                value: 'quoted-printable'
            }]).content = cleartextMessage;
        }

        // create a pgp/mime message
        // either pin the encrypted mime-subtree under the multipart/mixed node, OR 
        // create a top-level multipart/encrypted node
        encryptedNode = (multipartParentNode || builder).createNode([{
            key: 'Content-Type',
            value: 'multipart/encrypted',
            parameters: {
                protocol: 'application/pgp-encrypted'
            }
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }, {
            key: 'Content-Description',
            value: 'OpenPGP encrypted message'
        }]);
        encryptedNode.content = 'This is an OpenPGP/MIME encrypted message.';

        // set the version info
        encryptedNode.createNode([{
            key: 'Content-Type',
            value: 'application/pgp-encrypted'
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }, {
            key: 'Content-Description',
            value: 'PGP/MIME Versions Identification'
        }]).content = 'Version: 1';

        // set the ciphertext
        encryptedNode.createNode([{
            key: 'Content-Type',
            value: 'application/octet-stream'
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }, {
            key: 'Content-Description',
            value: 'OpenPGP encrypted message'
        }, {
            key: 'Content-Disposition',
            value: 'inline',
            parameters: {
                filename: 'encrypted.asc'
            }
        }]).content = ciphertext;
    };

    PgpMailer.prototype._send = function() {
        var builder = this._current.builder,
            callback = this._current.callback;

        this._smtp.on('message', function() {
            this._smtp.end(builder.build());
        }.bind(this));

        this._smtp.on('rcptFailed', callback);

        this._smtp.on('ready', function() {
            this._current = false;
            callback();
        }.bind(this));

        this._smtp.useEnvelope(builder.getEnvelope());
    };

    PgpMailer.prototype.stop = function(callback) {
        this._smtp.once('end', callback);
        this._smtp.quit();
    };

    //
    // Helper Functions
    //

    /**
     * Converts a Uint8Array to an 8-bit binary string
     * @param  {Uint8Array} arr The array to convert into a string
     * @return {String}     An 8-bit binary string
     */
    function arr2str(arr) {
        var i, l, str = '';

        for (i = 0, l = arr.length; i < l; i++) {
            str += String.fromCharCode(arr[i]);
        }

        return str;
    }



    return PgpMailer;
});