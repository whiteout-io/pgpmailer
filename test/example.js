if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        'use strict';

        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    'use strict';

    var PgpMailer = require('../src/pgpmailer'),
        chai = require('chai'),
        expect = chai.expect;

    chai.Assertion.includeStack = true;

    describe('send', function() {
        it('should work', function(done) {
            this.timeout(10000);

            var mailer = new PgpMailer({
                host: 'smtp.gmail.com',
                port: 465,
                auth: {
                    user: 'ACCOUNT',
                    pass: 'PASSWORD'
                },
                secureConnection: true,
                tls: {
                    ca: ['TRUSTY CA']
                },
                onError: function(error) {
                    console.error(error);
                }

            });

            mailer.setPrivateKey({
                privateKeyArmored: 'ASCII ARMORED PRIVATE KEY',
                passphrase: 'PASSPHRASE'
            }, function(error) {
                expect(error).to.not.exist;
            });

            var publicKeysArmored = ['ASCII ARMORED PUBLIC KEY OF THE SENDER', 'FIRST RECEIVER KEY', 'ANOTHER RECEIVER KEY', 'COPY RECEIVER KEY', 'BLINDCOPY RECEIVER KEY'];
            var mail = {
                from: ['sender@foobar.com'],
                to: ['recipient@foobar.com', 'another_recipient@foobar.com'],
                cc: ['receive.a.copy@foobar.com'],
                bcc: ['blindcopy@foobar.com'],
                subject: 'hello, pgp',
                body: 'hello, world!',
                attachments: [{
                    mimeType: 'text/plain',
                    filename: 'foobar.txt',
                    content: asciiToUInt8Array('I AM THE MIGHTY ATTACHMENT!')
                }]
            };
            var cleartextMessage = 'This message is prepended to your encrypted message and displayed in the clear even if your recipient does not speak PGP!';

            mailer.send({
                mail: mail,
                encrypt: true,
                publicKeysArmored: publicKeysArmored,
                cleartextMessage: cleartextMessage
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    //
    // Helper Functions
    //
    function asciiToUInt8Array(str) {
        var bufView = new Uint8Array(str.length);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }
});