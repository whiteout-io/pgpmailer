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
        Mailbuilder = require('mailbuilder'),
        simplesmtp = require('simplesmtp'),
        openpgp = require('openpgp');

    chai.Assertion.includeStack = true;

    var SmtpContructorMock = function() {};
    SmtpContructorMock.prototype.connect = function() {};
    SmtpContructorMock.prototype.quit = function() {};
    SmtpContructorMock.prototype.on = function() {};
    SmtpContructorMock.prototype.once = function() {};
    SmtpContructorMock.prototype.removeAllListeners = function() {};
    SmtpContructorMock.prototype.useEnvelope = function() {};
    SmtpContructorMock.prototype.end = function() {};

    describe('unit tests', function() {
        var mailer, smtpMock, ready, builderMock,
            rootNodeMock, contentNodeMock, signatureNodeMock,
            encryptedRootMock, multipartRootMock;

        beforeEach(function() {
            var opts;

            rootNodeMock = sinon.createStubInstance(Mailbuilder.Node);
            contentNodeMock = sinon.createStubInstance(Mailbuilder.Node);
            signatureNodeMock = sinon.createStubInstance(Mailbuilder.Node);

            multipartRootMock = sinon.createStubInstance(Mailbuilder.Node);
            encryptedRootMock = sinon.createStubInstance(Mailbuilder.Node);
            builderMock = sinon.createStubInstance(Mailbuilder);
            builderMock.node = rootNodeMock;

            smtpMock = sinon.createStubInstance(SmtpContructorMock);
            var createClientStub = sinon.stub(simplesmtp, 'createClient', function() {
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

            mailer = new PgpMailer(opts, openpgp, simplesmtp);
            mailer._privateKey = 'asdasdasdasd';

            expect(createClientStub.calledOnce).to.be.true;
            expect(createClientStub.calledWith(opts.port, opts.host, opts)).to.be.true;
            expect(smtpMock.on.calledWith('idle')).to.be.true;
            expect(smtpMock.on.calledWith('error')).to.be.true;
        });

        afterEach(function() {
            simplesmtp.createClient.restore();
        });

        describe('login', function() {
            it('should work', function() {
                smtpMock.connect.returns();

                mailer.login();

                expect(smtpMock.connect.calledOnce).to.be.true;
            });
        });

        describe('logout', function() {
            it('should work', function(done) {
                smtpMock.quit.returns();
                smtpMock.once.yields();

                mailer.logout(done);

                expect(smtpMock.quit.calledOnce).to.be.true;
                expect(smtpMock.once.calledOnce).to.be.true;
            });
        });

        describe('set private key', function() {
            var readArmoredStub;

            beforeEach(function() {
                delete mailer._privateKey;
                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
            });

            afterEach(function() {
                openpgp.key.readArmored.restore();
            });

            it('should set the private key', function(done) {
                var opts = {
                    privateKeyArmored: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE'
                };

                readArmoredStub.returns({
                    keys: [{
                        decrypt: function() {
                            return true;
                        }
                    }]
                });

                mailer.setPrivateKey(opts, function(err) {
                    expect(err).to.not.exist;
                    expect(readArmoredStub.calledWith(opts.privateKeyArmored)).to.be.true;
                    expect(mailer._privateKey).to.exist;

                    done();
                });
            });

            it('should not set the private key due to wrong password', function(done) {
                var opts = {
                    privateKeyArmored: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE'
                };

                readArmoredStub.returns({
                    keys: [{
                        decrypt: function() {
                            return false;
                        }
                    }]
                });

                mailer.setPrivateKey(opts, function(err) {
                    expect(err).to.exist;
                    expect(readArmoredStub.calledWith(opts.privateKeyArmored)).to.be.true;
                    expect(mailer._privateKey).to.not.exist;

                    done();
                });
            });

            it('should not set the private key and throw an exception', function(done) {
                var opts = {
                    privateKeyArmored: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE'
                };

                readArmoredStub.throws('FOOBAR!');

                mailer.setPrivateKey(opts, function(err) {
                    expect(err).to.exist;
                    expect(readArmoredStub.calledWith(opts.privateKeyArmored)).to.be.true;
                    expect(mailer._privateKey).to.not.exist;

                    done();
                });
            });
        });

        describe('smtp idle state', function() {
            it('should trigger the client', function() {
                ready(); // smtp enters idle mode and is ready to send stuff

                expect(mailer._busy).to.be.false; // now we should be ready to send
            });
        });

        describe('send', function() {
            it('should send an encrypted signed message with attachments', function(done) {
                var cb, mail, mockCiphertext, mockPlaintext, mockCompiledMail, mockSignature,
                    readArmoredStub, signAndEncryptStub, signClearStub, publicKeysArmored;

                //
                // Setup Fixture
                //

                publicKeysArmored = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mail = {
                    from: [{
                        address: 'a@a.io'
                    }],
                    to: [{
                        address: 'b@b.io'
                    }, {
                        address: 'c@c.io'
                    }],
                    cc: [{
                        address: 'd@d.io'
                    }],
                    bcc: [{
                        address: 'e@e.io'
                    }],
                    subject: 'foobar',
                    body: 'hello, world!',
                    attachments: [{
                        mimeType: 'text/plain',
                        filename: 'a.txt',
                        content: utf16ToUInt8Array('attachment1')
                    }]
                };

                mockCompiledMail = 'THIS! IS! PGP!';
                mockCiphertext = 'MORE PGP THAN YOU CAN HANDLE!';
                mockPlaintext = 'BLABLABLABLAYADDAYADDA\r\n\r\n';
                mockSignature = '-----BEGIN PGP SIGNATURE-----UMBAPALLUMBA-----END PGP SIGNATURE-----';

                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                readArmoredStub.returns({
                    keys: [{}]
                });
                signAndEncryptStub = sinon.stub(openpgp, 'signAndEncryptMessage');
                signAndEncryptStub.yields(null, mockCiphertext);
                signClearStub = sinon.stub(openpgp, 'signClearMessage');
                signClearStub.withArgs([mailer._privateKey], mockPlaintext.trim() + '\r\n').yields(null, mockSignature);

                contentNodeMock.build.returns(mockPlaintext);
                builderMock.build.returns(mockCompiledMail);
                builderMock.getEnvelope.returns({});
                builderMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'multipart/signed',
                    parameters: {
                        micalg: 'pgp-sha256',
                        protocol: 'application/pgp-signature'
                    }
                }]).returns(rootNodeMock);

                rootNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'multipart/mixed',
                }]).returns(contentNodeMock);

                rootNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'application/pgp-signature'
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: '7bit'
                }]).returns(signatureNodeMock);

                contentNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'text/plain',
                    parameters: {
                        charset: 'utf-8'
                    }
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'quoted-printable'
                }]).returns({});

                contentNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: mail.attachments[0].mimeType
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'base64'
                }, {
                    key: 'Content-Disposition',
                    value: 'attachment',
                    parameters: {
                        filename: mail.attachments[0].filename
                    }
                }]).returns({});

                builderMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'multipart/mixed',
                }]).returns(multipartRootMock);

                multipartRootMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'text/plain',
                    parameters: {
                        charset: 'utf-8'
                    }
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'quoted-printable'
                }]).returns({});

                multipartRootMock.createNode.withArgs([{
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
                }]).returns(encryptedRootMock);

                encryptedRootMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'application/pgp-encrypted'
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: '7bit'
                }, {
                    key: 'Content-Description',
                    value: 'PGP/MIME Versions Identification'
                }]).returns({});

                encryptedRootMock.createNode.withArgs([{
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
                }]).returns({});

                smtpMock.on.withArgs('message').yields();
                smtpMock.on.withArgs('ready').yieldsAsync();

                //
                // Prepare SUT
                //

                cb = function(err) {
                    expect(err).to.not.exist;

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
                    expect(builderMock.setFrom.calledWith(mail.from[0].address)).to.be.true;
                    expect(builderMock.addTo.calledWith(mail.to[0].address)).to.be.true;
                    expect(builderMock.addTo.calledWith(mail.to[1].address)).to.be.true;
                    expect(builderMock.addCc.calledWith(mail.cc[0].address)).to.be.true;
                    expect(builderMock.addBcc.calledWith(mail.bcc[0].address)).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                    expect(smtpMock.end.calledOnce).to.be.true;
                    expect(smtpMock.useEnvelope.calledWith({})).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;

                    // check the registered event handlers on the smtp client
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.build.calledOnce).to.be.true;
                    expect(builderMock.createNode.callCount).to.equal(2);
                    expect(rootNodeMock.createNode.calledTwice).to.be.true;
                    expect(contentNodeMock.createNode.calledTwice).to.be.true;
                    expect(encryptedRootMock.createNode.calledTwice).to.be.true;
                    expect(multipartRootMock.createNode.calledTwice).to.be.true;

                    // check that the pgp lib was called
                    expect(signClearStub.calledOnce).to.be.true;
                    expect(readArmoredStub.callCount).to.equal(publicKeysArmored.length);
                    publicKeysArmored.forEach(function(armored) {
                        expect(readArmoredStub.calledWith(armored)).to.be.true;
                    });
                    expect(signAndEncryptStub.calledOnce).to.be.true;

                    // restore stubs
                    openpgp.key.readArmored.restore();
                    openpgp.signAndEncryptMessage.restore();
                    openpgp.signClearMessage.restore();

                    done();
                };

                // queue the mail
                mailer.send({
                    mail: mail,
                    encrypt: true,
                    publicKeysArmored: publicKeysArmored,
                    cleartextMessage: 'hello!'
                }, cb, builderMock);

                // check that the message is queued
                expect(mailer._queue.length).to.equal(1);


                //
                // Execute Test
                //

                ready(); // and ... weeeeeeee
            });

            it('should send a signed message in the clear', function() {
                var cb, mail, mockPlaintext, mockCompiledMail, mockSignature, signClearStub, publicKeysArmored;

                //
                // Setup Fixture
                //

                cb = function(err) {
                    expect(err).to.not.exist;
                };

                publicKeysArmored = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mail = {
                    from: [{
                        address: 'a@a.io'
                    }],
                    to: [{
                        address: 'b@b.io'
                    }, {
                        address: 'c@c.io'
                    }],
                    cc: [{
                        address: 'd@d.io'
                    }],
                    bcc: [{
                        address: 'e@e.io'
                    }],
                    subject: 'foobar',
                    body: 'hello, world!',
                    attachments: [{
                        mimeType: 'text/plain',
                        filename: 'a.txt',
                        content: utf16ToUInt8Array('attachment1')
                    }]
                };

                mockCompiledMail = 'THIS! IS! PGP!';
                mockPlaintext = 'BLABLABLABLAYADDAYADDA\r\n\r\n';
                mockSignature = '-----BEGIN PGP SIGNATURE-----UMBAPALLUMBA-----END PGP SIGNATURE-----';

                signClearStub = sinon.stub(openpgp, 'signClearMessage');
                signClearStub.withArgs([mailer._privateKey], mockPlaintext.trim() + '\r\n').yields(null, mockSignature);

                contentNodeMock.build.returns(mockPlaintext);
                builderMock.build.returns(mockCompiledMail);
                builderMock.getEnvelope.returns({});
                builderMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'multipart/signed',
                    parameters: {
                        micalg: 'pgp-sha256',
                        protocol: 'application/pgp-signature'
                    }
                }]).returns(rootNodeMock);

                rootNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'multipart/mixed',
                }]).returns(contentNodeMock);

                rootNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'application/pgp-signature'
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: '7bit'
                }]).returns(signatureNodeMock);

                contentNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: 'text/plain',
                    parameters: {
                        charset: 'utf-8'
                    }
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'quoted-printable'
                }]).returns({});

                contentNodeMock.createNode.withArgs([{
                    key: 'Content-Type',
                    value: mail.attachments[0].mimeType
                }, {
                    key: 'Content-Transfer-Encoding',
                    value: 'base64'
                }, {
                    key: 'Content-Disposition',
                    value: 'attachment',
                    parameters: {
                        filename: mail.attachments[0].filename
                    }
                }]).returns({});

                smtpMock.on.withArgs('message').yields();
                smtpMock.on.withArgs('ready').yieldsAsync();

                //
                // Prepare SUT
                //

                // queue the mail
                mailer.send({
                    mail: mail,
                    publicKeysArmored: publicKeysArmored,
                    cleartextMessage: 'hello!'
                }, cb, builderMock);

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
                expect(builderMock.setFrom.calledWith(mail.from[0].address)).to.be.true;
                expect(builderMock.addTo.calledWith(mail.to[0].address)).to.be.true;
                expect(builderMock.addTo.calledWith(mail.to[1].address)).to.be.true;
                expect(builderMock.addCc.calledWith(mail.cc[0].address)).to.be.true;
                expect(builderMock.addBcc.calledWith(mail.bcc[0].address)).to.be.true;

                // check that the smtp client was called with the right stuff
                expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                expect(smtpMock.end.calledOnce).to.be.true;
                expect(smtpMock.useEnvelope.calledWith({})).to.be.true;
                expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;

                // check the registered event handlers on the smtp client
                expect(smtpMock.on.calledWith('message')).to.be.true;
                expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                expect(smtpMock.on.calledWith('ready')).to.be.true;

                // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                expect(builderMock.createNode.calledOnce).to.be.true;
                expect(builderMock.build.calledOnce).to.be.true;
                expect(rootNodeMock.createNode.calledTwice).to.be.true;
                expect(contentNodeMock.createNode.calledTwice).to.be.true;
                expect(encryptedRootMock.createNode.called).to.be.false;

                // check that the pgp lib was called
                expect(signClearStub.calledOnce).to.be.true;

                // restore stubs
                openpgp.signClearMessage.restore();
            });

            it('should not send without a private key', function(done) {
                delete mailer._privateKey;

                mailer.send({
                    mail: {},
                    publicKeysArmored: [],
                    cleartextMessage: 'hello!'
                }, function(error) {
                    expect(error).to.exist;

                    done();
                });
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