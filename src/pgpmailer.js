'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var PgpBuilder = require('pgpbuilder'),
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
    PgpMailer = function(options, pgpbuilder, smtp, pgp) {
        this._queue = [];
        this._busy = true;

        this._pgpbuilder = pgpbuilder || new PgpBuilder(options, pgp);
        this._smtp = (smtp || simplesmtp).createClient(options.port, options.host, options);

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

    PgpMailer.prototype.login = function() {
        this._smtp.connect();
    };

    PgpMailer.prototype.logout = function(callback) {
        this._smtp.quit();
        this._smtp.once('end', callback);
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
     * Queues a mail object for sending.
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

            self._queue.push({
                envelope: envelope,
                rfc: rfc,
                callback: callback
            });

            self._processQueue();
        }
    };

    PgpMailer.prototype.encrypt = function(options, callback) {
        this._pgpbuilder.encrypt(options, callback);
    };

    PgpMailer.prototype.reEncrypt = function(options, callback) {
        this._pgpbuilder.reEncrypt(options, callback);
    };

    PgpMailer.prototype._processQueue = function() {
        var self = this;

        if (self._busy || self._queue.length === 0) {
            return;
        }

        self._busy = true;

        var current = self._queue.shift();

        self._smtp.on('message', function() {
            self._smtp.end(current.rfc);
        });

        self._smtp.on('rcptFailed', current.callback);

        self._smtp.on('ready', function() {
            current.callback();
        });

        self._smtp.useEnvelope(current.envelope);
    };

    return PgpMailer;
});