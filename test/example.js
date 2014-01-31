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
                }
            });

            var mail = {
                from: {
                    address: 'SENDER',
                    publicKey: 'ASCII ARMORED PUBLIC KEY',
                    privateKey: 'ASCII ARMORED PBKDF2 ENCRYPTED PRIVATE KEY',
                    passphrase: 'PASSWORD'
                },
                to: [{
                    address: 'RECIPIENT',
                    publicKey: 'ASCII ARMORED PUBLIC KEY'
                }],
                cc: [],
                bcc: [],
                subject: 'hello, pgp',
                text: 'hello, world!',
                attachments: [{
                    contentType: 'text/plain',
                    fileName: 'a.txt',
                    uint8Array: utf16ToUInt8Array('I AM THE MIGHTY ATTACHMENT!')
                }]
            };

            mailer.send(mail, function(err) {
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