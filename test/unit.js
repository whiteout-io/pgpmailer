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
        PgpMailer = require("../src/pgpmailer"),
        Mailbuilder = require('mailbuilder'),
        simplesmtp = require('simplesmtp'),
        openpgp = require('openpgp');

    chai.Assertion.includeStack = true;

    var SmtpContructorMock = function() {};
    SmtpContructorMock.prototype.on = function() {};
    SmtpContructorMock.prototype.once = function() {};
    SmtpContructorMock.prototype.removeListener = function() {};
    SmtpContructorMock.prototype.useEnvelope = function() {};
    SmtpContructorMock.prototype.end = function() {};
    SmtpContructorMock.prototype.quite = function() {};


    describe('unit tests', function() {
        var mailer, builderMock, mimeNodeMock, smtpMock, ready;

        beforeEach(function() {
            mimeNodeMock = sinon.createStubInstance(Mailbuilder.Node);
            builderMock = sinon.createStubInstance(Mailbuilder);
            builderMock.node = mimeNodeMock;
            smtpMock = sinon.createStubInstance(SmtpContructorMock);
            var connectStub = sinon.stub(simplesmtp, 'connect', function() {
                return smtpMock;
            });

            // workaround to get a hold on the callback function that triggers the next mail to be sent
            smtpMock.on.withArgs('idle', sinon.match(function(cb) {
                ready = cb;
            }));

            mailer = new PgpMailer({}, openpgp, simplesmtp);

            expect(connectStub.called).to.be.true;
            expect(smtpMock.on.calledWith('idle')).to.be.true;
            expect(smtpMock.on.calledWith('error')).to.be.true;
        });

        afterEach(function() {
            simplesmtp.connect.restore();
        });

        describe('initial setup', function() {
            it('should be correct', function() {
                expect(mailer).to.exist;
                expect(mailer._pgp).to.exist;
                expect(mailer._smtp).to.exist;
                expect(mailer._queue).to.deep.equal([]);
                expect(mailer._busy).to.be.true;
                expect(mailer._current).to.be.undefined;
            });
        });

        describe('smtp idle state', function() {
            it('should trigger the client', function() {
                ready(); // smtp enters idle mode and is ready to send stuff

                expect(mailer._busy).to.be.false; // now we should be ready to send
            });
        });

        describe('send', function() {
            it('should send a message with attachments when ready', function() {
                var cb, mail, mockCiphertext, mockPlaintext, mockEnvelope,
                    mockPrivateKey, mockCompiledMail,
                    readArmoredStub, signAndEncryptStub;

                //
                // Setup Fixture
                //

                mail = {
                    from: {
                        address: 'a@a.io',
                        privateKey: 'privateA',
                        publicKey: 'publicA',
                        passphrase: 'yadddayadda'
                    },
                    to: [{
                        address: 'b@b.io',
                        publicKey: 'publicB'
                    }, {
                        address: 'c@c.io',
                        publicKey: 'publicC'
                    }],
                    cc: [{
                        address: 'd@d.io',
                        publicKey: 'publicD'
                    }],
                    bcc: [{
                        address: 'e@e.io',
                        publicKey: 'publicE'
                    }],
                    subject: 'foobar',
                    text: 'hello, world!',
                    attachments: [{
                        contentType: 'text/plain',
                        fileName: 'a.txt',
                        uint8Array: utf16ToUInt8Array('attachment1')
                    }]
                };
                mockCompiledMail = 'THIS! IS! PGP!';
                mockCiphertext = 'MORE PGP THAN YOU CAN HANDLE!';
                mockPlaintext = 'BLABLABLABLAYADDAYADDA';
                mockEnvelope = {};
                mockPrivateKey = {
                    keys: [{
                        decrypt: function() {
                            return true;
                        }
                    }]
                };
                readArmoredStub = sinon.stub(openpgp.key, 'readArmored', function(arg) {
                    return (arg === mail.from.privateKey) ? mockPrivateKey : {
                        keys: [{}]
                    };
                });
                signAndEncryptStub = sinon.stub(openpgp, 'signAndEncryptMessage', function() {
                    return mockCiphertext;
                });

                builderMock.createNode.returns(mimeNodeMock);
                builderMock.build.returns(mockCompiledMail);
                mimeNodeMock.createNode.returns({});
                mimeNodeMock.build.returns(mockPlaintext);

                builderMock.getEnvelope.returns(mockEnvelope);
                smtpMock.on.withArgs('message').yields();


                //
                // Prepare SUT
                //

                // queue the mail
                mailer.send(mail, cb, builderMock);

                // check that the message is queued
                expect(mailer._queue.length).to.equal(1);


                //
                // Execute Test
                //

                ready(); // and ... weeeeeeee


                //
                // Verification
                //

                // check the envelope setting
                expect(builderMock.setSubject.calledOnce).to.be.true;
                expect(builderMock.setFrom.calledOnce).to.be.true;
                expect(builderMock.addTo.calledTwice).to.be.true;
                expect(builderMock.addCc.calledOnce).to.be.true;
                expect(builderMock.addBcc.calledOnce).to.be.true;
                expect(builderMock.setSubject.calledWith(mail.subject)).to.be.true;
                expect(builderMock.setFrom.calledWith(mail.from.address)).to.be.true;
                expect(builderMock.addTo.calledWith(mail.to[0].address)).to.be.true;
                expect(builderMock.addTo.calledWith(mail.to[1].address)).to.be.true;
                expect(builderMock.addCc.calledWith(mail.cc[0].address)).to.be.true;
                expect(builderMock.addBcc.calledWith(mail.bcc[0].address)).to.be.true;

                // check that the smtp client was called with the right stuff
                expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                expect(smtpMock.end.calledOnce).to.be.true;
                expect(smtpMock.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;

                // check the registered event handlers on the smtp client
                expect(smtpMock.on.calledWith('message')).to.be.true;
                expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                expect(smtpMock.on.calledWith('ready')).to.be.true;

                // check that the mailbuilder has built a clear text and a pgp mail
                expect(builderMock.createNode.calledTwice).to.be.true;
                expect(builderMock.createNode.calledWith([{
                    key: 'Content-Type',
                    value: 'multipart/mixed',
                }])).to.be.true;
                expect(builderMock.createNode.calledWith([{
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
                }])).to.be.true;

                // check that the mailbuilder has compiled the pgp mail
                expect(builderMock.build.calledOnce).to.be.true;

                // check that the top level mime node has built:
                // - text/plain node,
                // - the text/plain attachment,
                // - the application/pgp-encrypted node,
                // - the inline attachment
                expect(mimeNodeMock.createNode.callCount).to.equal(4);
                expect(mimeNodeMock.createNode.calledWith([{
                    key: 'Content-Type',
                    value: 'text/plain'
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'quoted-printable'
                }])).to.be.true;
                expect(mimeNodeMock.createNode.calledWith([{
                    key: 'Content-Type',
                    value: mail.attachments[0].contentType
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'base64'
                }, {
                    key: 'Content-Disposition',
                    value: 'attachment',
                    parameters: {
                        filename: mail.attachments[0].fileName
                    }
                }])).to.be.true;
                expect(mimeNodeMock.createNode.calledWith([{
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
                }])).to.be.true;
                expect(mimeNodeMock.createNode.calledWith([{
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
                }])).to.be.true;

                // check that the pgp lib was called
                expect(readArmoredStub.callCount).to.equal(6);
                expect(signAndEncryptStub.calledOnce).to.be.true;

                // restore stubs
                openpgp.key.readArmored.restore();
                openpgp.signAndEncryptMessage.restore();
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