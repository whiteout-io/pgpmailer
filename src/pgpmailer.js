'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var PgpBuilder = require('pgpbuilder'),
        SmtpClient = require('smtpclient'),
        PgpMailer;

    /**
     * Constructor for the high level api.
     * @param {Number} options.port Port is the port to the server (defaults to 25 on non-secure and to 465 on secure connection).
     * @param {String} options.host Hostname of the server.
     * @param {String} options.auth.user Username for login
     * @param {String} options.auth.pass Password for login
     * @param {Boolean} options.secureConnection Indicates if the connection is using TLS or not
     * @param {String} options.tls Further optional object for tls.connect, e.g. { ca: 'PIN YOUR CA HERE' }
     * @param {String} options.onError Top-level error handler with information if an error occurred
     */
    PgpMailer = function(options) {
        this._options = options;
        this._pgpbuilder = new PgpBuilder(options);
    };

    /**
     * Set the private key used to sign your messages
     * @param {String} options.privateKey ASCII-armored private key to sign the messages
     * @param {String} options.passphrase The passphrase to encrypt options.armoredPrivateKey
     * @param {Function} callback(error) Indicates that the private key has been set, or provides error information
     */
    PgpMailer.prototype.setPrivateKey = function(options, callback) {
        this._pgpbuilder.setPrivateKey(options, callback);
    };

    /**
     * Sends a mail object.
     * @param {Boolean} options.encrypt (optional) If true, the message will be encrypted with the public keys in options.publicKeysArmored. Otherwise, the message will be signed with the private key and sent in the clear. Default: false
     * @param {Object} options.mail.from Array containing one object with the ASCII string representing the sender address, e.g. 'foo@bar.io'
     * @param {Array} options.mail.to (optional) Array of objects with the ASCII string representing the recipient (e.g. ['the.dude@lebowski.com', 'donny@kerabatsos.com'])
     * @param {Object} options.mail.cc (optional) Array of objects with the ASCII string representing the recipient, see mail.to
     * @param {Object} options.mail.bcc (optional) Array of objects with the ASCII string representing the recipient, see mail.to
     * @param {String} options.mail.subject String containing with the mail's subject
     * @param {String} options.mail.body Plain text body to be sent with the mail
     * @param {Array} options.mail.attachments (optional) Array of attachment objects with filename {String}, content {Uint8Array}, and mimeType {String}
     * @param {Boolean} options.mail.encrypted Indicating if the mail is already encrypted
     * @param {Object} options.cleartextMessage (optional) A clear text message in addition to the encrypted message
     * @param {Array} options.publicKeysArmored The public keys with which the message should be encrypted
     * @param {Function} callback(error) Indicates that the mail has been sent, or gives information in case an error occurred.
     */
    PgpMailer.prototype.send = function(options, callback) {
        var self = this;

        if (options.encrypt) {
            if (!options.mail.encrypted) {
                self._pgpbuilder.encrypt(options, function(error) {
                    if (error) {
                        callback(error);
                        return;
                    }

                    self._pgpbuilder.buildEncrypted(options, onBuildFinished);
                });
                return;
            }

            self._pgpbuilder.buildEncrypted(options, onBuildFinished);
            return;
        }

        self._pgpbuilder.buildSigned(options, onBuildFinished);

        function onBuildFinished(error, rfc, envelope) {
            if (error) {
                callback(error);
                return;
            }

            var smtp = options.smtpclient || new SmtpClient(self._options.host, self._options.port, {
                useSSL: self._options.secureConnection,
                ca: self._options.tls.ca,
                authMethod: (self._options.auth.xoauth2) ? 'XOAUTH2' : 'PLAIN',
                auth: {
                    user: self._options.auth.user,
                    pass: self._options.auth.pass,
                    token: self._options.auth.xoauth2
                }
            });

            smtp.onerror = callback;
            smtp.onidle = function() {
                // remove idle listener to prevent infinite loop
                smtp.onidle = function() {};
                // send envelope
                smtp.useEnvelope(envelope);
            };

            smtp.onready = function(failedRecipients) {
                if (failedRecipients && failedRecipients.length > 0) {
                    smtp.quit();
                    callback({
                        errMsg: 'Failed recipients: ' + JSON.stringify(failedRecipients)
                    });
                    return;
                }

                // send rfc body
                smtp.end(rfc);
            };

            smtp.ondone = function(success) {
                if (!success) {
                    smtp.quit();
                    callback({
                        errMsg: 'Sent message was not queued successfully by SMTP server!'
                    });
                    return;
                }

                // in some cases node.net throws an exception when we quit() the smtp client,
                // but the mail was already sent successfully, so we can ignore this error safely
                smtp.onerror = console.error;
                smtp.quit();

                callback();
            };

            // connect and wait for idle
            smtp.connect();
        }
    };

    PgpMailer.prototype.encrypt = function(options, callback) {
        this._pgpbuilder.encrypt(options, callback);
    };

    return PgpMailer;
});