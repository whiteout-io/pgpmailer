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
     * Constructor for the high level api. Will fire up the SMTP connection as soon as it is invoked
     * @param {Number} options.port Port is the port to the server (defaults to 25 on non-secure and to 465 on secure connection).
     * @param {String} options.host Hostname of the server.
     * @param {String} options.auth.user Username for login
     * @param {String} options.auth.pass Password for login
     * @param {Boolean} options.secureConnection Indicates if the connection is using TLS or not
     * @param {String} options.tls Further optional object for tls.connect
     */
    PgpMailer = function(options, pgp, smtp) {
        this._queue = [];
        this._busy = true;
        this._current = undefined;

        this._pgp = pgp || openpgp;
        this._smtp = (smtp || simplesmtp).connect(options);

        var ready = function() {
            this._smtp.removeListener('message');
            this._smtp.removeListener('rcptFailed');
            this._smtp.removeListener('ready');
            this._busy = false;
            this._processQueue();
        };

        // ready, waiting for an envelope
        this._smtp.on('idle', ready.bind(this));
        this._smtp.on('error', console.error);
    };

    /**
     * Queues a mail object for sending.
     * @param  {Object} mail.from Object with the ASCII string representing the sender address and the corresponding ASCII armored key pair and the passphrase to encrypt the private key, e.g. { address: 'foo@bar.io', privateKey: '...', publicKey: '...', passphrase: 'tralalala'}
     * @param  {Array} mail.to Array of objects with the ASCII string representing the recipient and the corresponding ASCII armored public key (e.g. [{ address: 'the.dude@lebowski.com', publicKey: '...' }, { address: 'donny@kerabatsos.com', publicKey: '...' }])
     * @param  {Object} mail.cc Array of objects with the ASCII string representing the recipient and the corresponding ASCII armored public key, see mail.to
     * @param  {Object} mail.bcc Array of objects with the ASCII string representing the recipient and the corresponding ASCII armored public key, see mail.to
     * @param  {String} mail.subject String containing with the mail's subject
     * @param  {Array} mail.headers Array of objects with key and value for additional headers, e.g. [{'X-Tralala': 'some-stuff']
     * @param  {String} mail.text Plain text to be sent with the mail
     * @param  {Array} mail.attachments Array of attachment objects with fileName {String}, uint8Array {Uint8Array}, and contentType {String}
     * @param  {Function} callback(error) Indicates that the mail has been sent, or gives information in case an error occurred.
     */
    PgpMailer.prototype.send = function(mail, callback, builder) {
        this._queue.push({
            builder: builder || new Mailbuilder(),
            mail: mail,
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
            parentNode;


        // 
        // create the envelope data
        // 

        builder.setSubject(mail.subject);

        // add everyone's addresses
        builder.setFrom(mail.from.address);
        mail.to.forEach(function(recipient) {
            builder.addTo(recipient.address);
        });
        mail.cc.forEach(function(recipient) {
            builder.addCc(recipient.address);
        });
        mail.bcc.forEach(function(recipient) {
            builder.addBcc(recipient.address);
        });


        // 
        // create the mime tree
        // 

        // this a plain text mail? then only one text/plain node is needed
        if (mail.attachments.length === 0) {
            builder.createNode([{
                key: 'Content-Type',
                value: 'text/plain'
            }, {
                key: 'Content-Transfer-Encoding',
                value: 'quoted-printable'
            }]).content = mail.text;

            return;
        }

        // we have attachments, so let's create a multipart/mixed mail
        parentNode = builder.createNode([{
            key: 'Content-Type',
            value: 'multipart/mixed',
        }]);

        // create the text/plain node
        parentNode.createNode([{
            key: 'Content-Type',
            value: 'text/plain'
        }, {
            key: 'Content-Transfer-Encoding',
            value: 'quoted-printable'
        }]).content = mail.text;

        // add the attachments
        mail.attachments.forEach(function(attmt) {
            parentNode.createNode([{
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
            }]).content = String.fromCharCode.apply(null, attmt.uint8Array);
        });
    };

    PgpMailer.prototype._encrypt = function() {
        var publicKeys = [],
            armoredPublicKeys = [],
            mail = this._current.mail,
            builder = this._current.builder,
            plaintext, ciphertext, parentNode;

        // prepare the plain text mime nodes
        plaintext = builder.node.build();

        // gather all the ASCII-armored public keys
        mail.to.concat(mail.cc.concat(mail.bcc.concat(mail.from))).forEach(function(i) {
            armoredPublicKeys.push(i.publicKey);
        });

        try {
            // decrypt the private key (for signing)
            var privateKey = openpgp.key.readArmored(mail.from.privateKey).keys[0];
            if (!privateKey.decrypt(mail.from.passphrase)) {
                // callback(error);
            }

            // parse the ASCII-armored public keys
            armoredPublicKeys.forEach(function(key) {
                publicKeys.push(openpgp.key.readArmored(key).keys[0]);
            });

            // encrypt the plain text
            ciphertext = openpgp.signAndEncryptMessage(publicKeys, privateKey, plaintext);
        } catch (err) {
            // callback(ERROR);
            return;
        }

        // delete the plain text from the builder
        delete builder.node;

        // create a pgp/mime message
        parentNode = builder.createNode([{
            key: 'Content-Type',
            value: 'multipart/encrypted',
            parameters: {
                protocol: "application/pgp-encrypted"
            }
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }, {
            key: 'Content-Description',
            value: 'OpenPGP encrypted message'
        }]);

        // set the version info
        parentNode.createNode([{
            key: 'Content-Type',
            value: 'multipart/encrypted',
            parameters: {
                protocol: "application/pgp-encrypted"
            }
        }, {
            key: 'Content-Transfer-Encoding',
            value: '7bit'
        }, {
            key: 'Content-Description',
            value: 'PGP/MIME Versions Identification'
        }]).content = 'Version: 1';

        // set the ciphertext
        parentNode.createNode([{
            key: 'Content-Type',
            value: 'application/octet-stream',
            parameters: {
                protocol: "application/pgp-encrypted"
            }
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

    return PgpMailer;
});