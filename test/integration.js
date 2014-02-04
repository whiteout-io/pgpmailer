'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var sinon = require('sinon'),
        chai = require('chai'),
        expect = chai.expect,
        PgpMailer = require('../src/pgpmailer'),
        simplesmtp = require('simplesmtp'),
        openpgp = require('openpgp'),
        MailParser = require('mailparser').MailParser;

    chai.Assertion.includeStack = true;

    var SmtpContructorMock = function() {};
    SmtpContructorMock.prototype.on = function() {};
    SmtpContructorMock.prototype.once = function() {};
    SmtpContructorMock.prototype.removeAllListeners = function() {};
    SmtpContructorMock.prototype.useEnvelope = function() {};
    SmtpContructorMock.prototype.end = function() {};
    SmtpContructorMock.prototype.quite = function() {};

    describe('integration tests', function() {
        var mailer, smtpMock, ready, pubkeyArmored;

        beforeEach(function(done) {
            var opts, privKey;

            smtpMock = sinon.createStubInstance(SmtpContructorMock);
            var connectStub = sinon.stub(simplesmtp, 'connect', function() {
                return smtpMock;
            });

            // workaround to get a hold on the callback function that triggers the next mail to be sent
            smtpMock.on.withArgs('idle', sinon.match(function(cb) {
                ready = cb;
            }));

            opts = {
                host: 'hello.world.com',
                port: 1337,
                auth: {},
                secureConnection: true,
                tls: {
                    ca: ['trusty cert']
                }
            };

            privKey = '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\n' +
                'Version: OpenPGP.js v.1.20131116\r\n' +
                'Comment: Whiteout Mail - http://whiteout.io\r\n' +
                '\r\n' +
                'xcL+BFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\n' +
                'qeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\n' +
                'xTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\n' +
                'KgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\n' +
                'nkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\n' +
                'YPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\n' +
                'AAH+AwMI8l5bp5J/xgpguvHaT2pX/6D8eU4dvODsvYE9Y4Clj0Nvm2nu4VML\r\n' +
                'niNb8qpzCXXfFqi1FWGrZ2msClxA1eiXfk2IEe5iAiY3a+FplTevBn6rkAMw\r\n' +
                'ly8wGyiNdE3TVWgCEN5YRaTLpfV02c4ECyKk713EXRAtQCmdty0yxv5ak9ey\r\n' +
                'XDUVd4a8T3QMgHcAOTXWMFJNUjeeiIdiThDbURJEv+9F+DW+4w5py2iw0PYJ\r\n' +
                'Nm6iAHCjoPQTbGLxstl2BYSocZWxG1usoPKhbugGZK0Vr8rdpsfakjJ9cJUg\r\n' +
                'YHIH3VT+y+u5mhY681NrB5koRUxDT6ridbytMcoK8xpqYG3FhC8CiVnzpDQ3\r\n' +
                'o1KRkWuxUq66oJhu0wungXcqaDzDUEfeUjMuKVI/d9/ViXy8IH/XdlOy0lLY\r\n' +
                'Oac0ovRjb7zgeVOp2e7N4eTu0dts3SE+Do1gyqZo2rf1dwsJQI9YUtpjYAtr\r\n' +
                'NBkKyRvBAhg9KPh1y2Y1u3ra5OS0yGuNDD8pXdiN3kxMt5OBlnWeFjL6ll7+\r\n' +
                'vgiKZooPUZPbFIWi4XBXTv7D5T9THDYmuJpcOffn1AA7j2FM8fkFvtiFyw9J\r\n' +
                '2S14penv2R7TeybxR6ktD7HtZd34gmGvmOxhWRNU/vfp4SisUcu9jzQq+cJt\r\n' +
                'joWuJiZ8xvWEC2DD32n9bWyIlGhS4hATqz/gEdSha8hxzT+GJi29jYjp8Hnc\r\n' +
                '9HwxOArz6Q5h/nDN2Xt5PuCM65J0dathzAm0A7BLRQI+4OjTW575sRKvarzH\r\n' +
                '8JZ+UYK2BgP4Kbh9JqhnD/2NKD/csuL6No5guyOH8+zekdBtFE394SV8e9N+\r\n' +
                'zYgzVex4SDG8y/YO7W7Tp6afNb+sqyzEw5Bknypn0Hc3cr9wy1P8jLMM2woL\r\n' +
                'GRDZ5IutCAV/D/h881dHJs0tV2hpdGVvdXQgVXNlciA8c2FmZXdpdGhtZS50\r\n' +
                'ZXN0dXNlckBnbWFpbC5jb20+wsBcBBABCAAQBQJSjg7aCRDX+5P837/CPAAA\r\n' +
                '3ZwH/2AVGYB+8RDarP5a5uZPYSxJKeM8zHMbi7LKQWhr5NpkJajZdra1CCGZ\r\n' +
                'TXTeQSRBvU4SNGOmDAlhf0qCGeXwMHIzrzovkBedHIc/vypEkItdJeXQAaJx\r\n' +
                'uhQOnmyi9priuzBBx4e9x1aBn+aAdNGiJB4l13L2T4fow8WLIVpVwXB6BWya\r\n' +
                'lz50JwLzJP6qHxkhvIZElTrQ+Yoo3stS6w/7wNtK/f3MIYkIGVVUrIDgzN0X\r\n' +
                'm4z6ypN1dsrM6tPkMZ0JlqjHiz7DXpKrWsfNkoVZ9A98osMH2nIDS58JVEDc\r\n' +
                'AXoFSLsbdmqFmIc2Ew828TjlX+FLU9tlx89WhSMTapzUjHU=\r\n' +
                '=wxuK\r\n' +
                '-----END PGP PRIVATE KEY BLOCK-----';

            pubkeyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n' +
                'Version: OpenPGP.js v.1.20131116\r\n' +
                'Comment: Whiteout Mail - http://whiteout.io\r\n' +
                '\r\n' +
                'xsBNBFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\n' +
                'qeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\n' +
                'xTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\n' +
                'KgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\n' +
                'nkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\n' +
                'YPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\n' +
                'AAHNLVdoaXRlb3V0IFVzZXIgPHNhZmV3aXRobWUudGVzdHVzZXJAZ21haWwu\r\n' +
                'Y29tPsLAXAQQAQgAEAUCUo4O2gkQ1/uT/N+/wjwAAN2cB/9gFRmAfvEQ2qz+\r\n' +
                'WubmT2EsSSnjPMxzG4uyykFoa+TaZCWo2Xa2tQghmU103kEkQb1OEjRjpgwJ\r\n' +
                'YX9Kghnl8DByM686L5AXnRyHP78qRJCLXSXl0AGicboUDp5sovaa4rswQceH\r\n' +
                'vcdWgZ/mgHTRoiQeJddy9k+H6MPFiyFaVcFwegVsmpc+dCcC8yT+qh8ZIbyG\r\n' +
                'RJU60PmKKN7LUusP+8DbSv39zCGJCBlVVKyA4MzdF5uM+sqTdXbKzOrT5DGd\r\n' +
                'CZaox4s+w16Sq1rHzZKFWfQPfKLDB9pyA0ufCVRA3AF6BUi7G3ZqhZiHNhMP\r\n' +
                'NvE45V/hS1PbZcfPVoUjE2qc1Ix1\r\n' +
                '=7Wpe\r\n' +
                '-----END PGP PUBLIC KEY BLOCK-----';

            mailer = new PgpMailer(opts, openpgp, simplesmtp);

            mailer.setPrivateKey({
                privateKeyArmored: privKey,
                passphrase: 'passphrase'
            }, function(err) {
                expect(err).to.not.exist;
                expect(connectStub.calledOnce).to.be.true;
                expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                expect(smtpMock.on.calledWith('idle')).to.be.true;
                expect(smtpMock.on.calledWith('error')).to.be.true;
                done();
            });
        });

        afterEach(function() {
            simplesmtp.connect.restore();
        });

        describe('send', function() {
            it('should send a message with attachments and decode the output correctly', function(done) {
                this.timeout(10000);

                var cb, mail, armoredPublicKeys, attachmentPayload;

                //
                // Setup Fixture
                //

                cb = function(err) {
                    expect(err).to.not.exist;
                };

                armoredPublicKeys = [pubkeyArmored];
                attachmentPayload = 'attachment1';
                mail = {
                    from: {
                        address: 'a@a.io'
                    },
                    to: [{
                        address: 'b@b.io'
                    }, {
                        address: 'c@c.io'
                    }],
                    subject: 'foobar',
                    body: 'hello, world!',
                    attachments: [{
                        contentType: 'text/plain',
                        fileName: 'a.txt',
                        uint8Array: utf16ToUInt8Array(attachmentPayload)
                    }]
                };

                smtpMock.on.withArgs('message').yields();
                smtpMock.end.withArgs(sinon.match(function(args) {
                    var sentRFCMessage = args;
                    var pgpPrefix = '-----BEGIN PGP MESSAGE-----';
                    var pgpSuffix = '-----END PGP MESSAGE-----';
                    var pgpMessage = pgpPrefix + sentRFCMessage.split(pgpPrefix).pop().split(pgpSuffix).shift() + pgpSuffix;

                    var pgpMessageObj = openpgp.message.readArmored(pgpMessage);
                    var publicKeyObj = openpgp.key.readArmored(pubkeyArmored).keys[0];

                    var decrypted = openpgp.decryptAndVerifyMessage(mailer._privateKey, [publicKeyObj], pgpMessageObj);
                    expect(decrypted).to.exist;
                    expect(decrypted.signatures[0].valid).to.be.true;
                    expect(decrypted.text).to.exist;

                    var parser = new MailParser();
                    parser.on('end', function(parsedMail) {
                        expect(parsedMail).to.exist;
                        expect(parsedMail.text.replace(/\n/g, '')).to.equal(mail.body);
                        expect(parsedMail.attachments[0].content.toString('binary')).to.equal(attachmentPayload);
                        
                        // var signatureArmored = parsedMail.attachments[1].content.toString('binary');
                        // var signatureMessage = openpgp.message.readArmored(signatureArmored);

                        // TODO verify application/pgp signature

                        done();
                    });
                    parser.end(decrypted.text);

                    return true;
                }));

                //
                // Prepare SUT
                //

                // queue the mail
                mailer.send(mail, armoredPublicKeys, cb);

                // check that the message is queued
                expect(mailer._queue.length).to.equal(1);


                //
                // Execute Test
                //

                ready(); // and ... weeeeeeee
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