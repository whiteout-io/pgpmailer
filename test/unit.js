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
    SmtpContructorMock.prototype.on = function() {};
    SmtpContructorMock.prototype.once = function() {};
    SmtpContructorMock.prototype.removeAllListeners = function() {};
    SmtpContructorMock.prototype.useEnvelope = function() {};
    SmtpContructorMock.prototype.end = function() {};
    SmtpContructorMock.prototype.quite = function() {};

    describe('unit tests', function() {
        describe('constructor', function() {
            var readArmoredStub, smtpMock, connectStub;

            beforeEach(function() {
                smtpMock = sinon.createStubInstance(SmtpContructorMock);
                connectStub = sinon.stub(simplesmtp, 'connect', function() {
                    return smtpMock;
                });
            });

            afterEach(function() {
                simplesmtp.connect.restore();
            });

            it('should work', function() {
                var mailer, opts;

                opts = {
                    host: 'hello.world.com',
                    port: 1337,
                    auth: {},
                    secureConnection: true,
                    tls: {
                        ca: ['trusty cert']
                    },
                    privateKey: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE',
                    onError: function(error) {
                        throw error;
                    }
                };

                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                readArmoredStub.returns({
                    keys: [{
                        decrypt: function() {
                            return true;
                        }
                    }]
                });

                mailer = new PgpMailer(opts, openpgp, simplesmtp);

                expect(connectStub.calledOnce).to.be.true;
                expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                expect(readArmoredStub.calledWith(opts.privateKey)).to.be.true;
                expect(smtpMock.on.calledWith('idle')).to.be.true;
                expect(smtpMock.on.calledWith('error')).to.be.true;

                expect(mailer).to.exist;
                expect(mailer._pgp).to.exist;
                expect(mailer._smtp).to.exist;
                expect(mailer._queue).to.deep.equal([]);
                expect(mailer._busy).to.be.true;
                expect(mailer._current).to.be.undefined;

                openpgp.key.readArmored.restore();
            });

            it('should throw during readArmored', function(done) {
                var mailer, opts;

                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                readArmoredStub.throws('FOOBAR!');

                opts = {
                    host: 'hello.world.com',
                    port: 1337,
                    auth: {},
                    secureConnection: true,
                    tls: {
                        ca: ['trusty cert']
                    },
                    privateKey: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE',
                    onError: function(error) {
                        expect(error).to.exist;
                        expect(connectStub.called).to.be.false;
                        expect(readArmoredStub.calledWith(opts.privateKey)).to.be.true;
                        expect(smtpMock.on.called).to.be.false;
                        openpgp.key.readArmored.restore();
                        done();
                    }
                };

                mailer = new PgpMailer(opts, openpgp, simplesmtp);
            });

            it('should fail during decrypt', function(done) {
                var mailer, opts;

                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                readArmoredStub.returns({
                    keys: [{
                        decrypt: function() {
                            return false;
                        }
                    }]
                });

                opts = {
                    host: 'hello.world.com',
                    port: 1337,
                    auth: {},
                    secureConnection: true,
                    tls: {
                        ca: ['trusty cert']
                    },
                    privateKey: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE',
                    onError: function(error) {
                        expect(error).to.exist;
                        expect(connectStub.called).to.be.false;
                        expect(readArmoredStub.calledWith(opts.privateKey)).to.be.true;
                        expect(smtpMock.on.called).to.be.false;
                        openpgp.key.readArmored.restore();

                        done();
                    }
                };

                mailer = new PgpMailer(opts, openpgp, simplesmtp);
            });
        });

        describe('object', function() {
            var mailer, smtpMock, ready, builderMock,
                rootNodeMock, contentNodeMock, signatureNodeMock,
                encryptedRootMock;

            beforeEach(function() {
                var opts, readArmoredStub;

                rootNodeMock = sinon.createStubInstance(Mailbuilder.Node);
                contentNodeMock = sinon.createStubInstance(Mailbuilder.Node);
                signatureNodeMock = sinon.createStubInstance(Mailbuilder.Node);
                encryptedRootMock = sinon.createStubInstance(Mailbuilder.Node);
                builderMock = sinon.createStubInstance(Mailbuilder);
                builderMock.node = rootNodeMock;

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
                    },
                    privateKey: 'PRIVATE KEY',
                    passphrase: 'PASSPHRASE'

                };

                readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                readArmoredStub.returns({ keys: [{ decrypt: function() { return true; } }] });

                mailer = new PgpMailer(opts, openpgp, simplesmtp);

                expect(connectStub.calledOnce).to.be.true;
                expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                expect(smtpMock.on.calledWith('idle')).to.be.true;
                expect(smtpMock.on.calledWith('error')).to.be.true;

                openpgp.key.readArmored.restore();
            });

            afterEach(function() {
                simplesmtp.connect.restore();
            });

            describe('smtp idle state', function() {
                it('should trigger the client', function() {
                    ready(); // smtp enters idle mode and is ready to send stuff

                    expect(mailer._busy).to.be.false; // now we should be ready to send
                });
            });

            describe('send', function() {
                it('should send a message with attachments when ready', function() {
                    var cb, mail, mockCiphertext, mockPlaintext, mockCompiledMail, mockSignature,
                        readArmoredStub, signAndEncryptStub, signClearStub, armoredPublicKeys;

                    //
                    // Setup Fixture
                    //
                    
                    cb = function(err) {
                        expect(err).to.not.exist;
                    };

                    armoredPublicKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                    mail = {
                        from: { address: 'a@a.io' },
                        to: [{ address: 'b@b.io' }, { address: 'c@c.io' }],
                        cc: [{ address: 'd@d.io' }],
                        bcc: [{ address: 'e@e.io' }],
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
                    mockSignature = '-----BEGIN PGP SIGNATURE-----UMBAPALLUMBA-----END PGP SIGNATURE-----';

                    readArmoredStub = sinon.stub(openpgp.key, 'readArmored');
                    readArmoredStub.returns({ keys: [{}] });
                    signAndEncryptStub = sinon.stub(openpgp, 'signAndEncryptMessage');
                    signAndEncryptStub.returns(mockCiphertext);
                    signClearStub = sinon.stub(openpgp, 'signClearMessage');
                    signClearStub.returns(mockSignature);

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
                    builderMock.createNode.withArgs([{
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
                    }]).returns({});
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

                    //
                    // Prepare SUT
                    //

                    // queue the mail
                    mailer.send(mail, armoredPublicKeys, cb, builderMock);

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
                    expect(smtpMock.useEnvelope.calledWith({})).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;

                    // check the registered event handlers on the smtp client
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.createNode.calledTwice).to.be.true;
                    expect(builderMock.build.calledOnce).to.be.true;

                    // check that the top level mime node has built:
                    expect(rootNodeMock.createNode.callCount).to.equal(2);
                    expect(contentNodeMock.createNode.callCount).to.equal(2);
                    expect(encryptedRootMock.createNode.callCount).to.equal(2);

                    // check that the pgp lib was called
                    expect(readArmoredStub.callCount).to.equal(armoredPublicKeys.length);
                    armoredPublicKeys.forEach(function(armored) {
                        expect(readArmoredStub.calledWith(armored)).to.be.true;
                    });
                    expect(signAndEncryptStub.calledOnce).to.be.true;

                    // restore stubs
                    openpgp.key.readArmored.restore();
                    openpgp.signAndEncryptMessage.restore();
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