'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
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
                privateKey: 'ASCII ARMORED PRIVATE KEY',
                passphrase: 'PASSPHRASE'
            }, function(error) {
                expect(error).to.not.exist;
            });

            var armoredPublicKeys = ['ASCII ARMORED PUBLIC KEY OF THE SENDER', 'FIRST RECEIVER KEY', 'ANOTHER RECEIVER KEY', 'COPY RECEIVER KEY', 'BLINDCOPY RECEIVER KEY'];
            var mail = {
                from: 'sender@foobar.com',
                to: ['recipient@foobar.com', 'another_recipient@foobar.com'],
                cc: ['receive.a.copy@foobar.com'],
                bcc: ['blindcopy@foobar.com'],
                subject: 'hello, pgp',
                text: 'hello, world!',
                attachments: [{
                    contentType: 'text/plain',
                    fileName: 'foobar.txt',
                    uint8Array: utf16ToUInt8Array('I AM THE MIGHTY ATTACHMENT!')
                }]
            };

            mailer.send(mail, armoredPublicKeys, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    //
    // Helper Functions
    //
    function utf16ToUInt8Array(str) {
        var bufView = new Uint16Array(new ArrayBuffer(str.length * 2));
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }
});
