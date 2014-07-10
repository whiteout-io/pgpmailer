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
        PgpBuilder = require('pgpbuilder'),
        SmtpClient = require('smtpclient');

    chai.Assertion.includeStack = true;

    describe('unit tests', function() {
        var mailer, smtpClientStub, builderMock, opts;

        beforeEach(function() {
            opts = {
                host: 'hello.world.com',
                port: 1337,
                auth: {},
                secureConnection: true,
                tls: {
                    ca: ['trusty cert']
                }
            };

            builderMock = sinon.createStubInstance(PgpBuilder);
            smtpClientStub = sinon.createStubInstance(SmtpClient);
            mailer = new PgpMailer(opts, builderMock);
        });

        afterEach(function() {});

        describe('set private key', function() {
            it('should set the private key', function(done) {
                builderMock.setPrivateKey.withArgs({}).yieldsAsync();

                mailer.setPrivateKey({}, function(err) {
                    expect(err).to.not.exist;
                    expect(builderMock.setPrivateKey.calledOnce).to.be.true;

                    done();
                });
            });

            it('should not set the private key due to error', function(done) {
                builderMock.setPrivateKey.yieldsAsync({});

                mailer.setPrivateKey({}, function(err) {
                    expect(err).to.exist;
                    expect(builderMock.setPrivateKey.calledOnce).to.be.true;

                    done();
                });
            });
        });

        describe('send encrypted', function() {
            it('should should fail due to error in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.yields();
                builderMock.buildEncrypted.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.exist;
                    expect(rfcText).to.not.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(0);
                    expect(smtpClientStub.end.callCount).to.equal(0);
                    expect(smtpClientStub.quit.callCount).to.equal(0);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onerror(new Error('Boom!'));
            });

            it('should should fail due to failedRecipients in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.yields();
                builderMock.buildEncrypted.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.exist;
                    expect(rfcText).to.not.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.withArgs(mockEnvelope).callCount).to.equal(1);
                    expect(smtpClientStub.end.callCount).to.equal(0);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onidle();
                smtpClientStub.onready('Failed recipients!');
            });

            it('should should fail due to unsucessful ondone in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.yields();
                builderMock.buildEncrypted.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.exist;
                    expect(rfcText).to.not.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.withArgs(mockEnvelope).callCount).to.equal(1);
                    expect(smtpClientStub.end.withArgs(mockCompiledMail).callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onidle();
                smtpClientStub.onready();
                smtpClientStub.ondone(false);
            });

            it('should encrypt and send an message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.yields();
                builderMock.buildEncrypted.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.not.exist;
                    expect(rfcText).to.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.withArgs(mockEnvelope).callCount).to.equal(1);
                    expect(smtpClientStub.end.withArgs(mockCompiledMail).callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onidle();
                smtpClientStub.onready();
                smtpClientStub.ondone(true);
                smtpClientStub.onclose();
            });

            it('should send a previously encrypted message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {
                    encrypted: true
                };
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.yields();
                builderMock.buildEncrypted.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.not.exist;
                    expect(rfcText).to.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.called).to.be.false;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.withArgs(mockEnvelope).callCount).to.equal(1);
                    expect(smtpClientStub.end.withArgs(mockCompiledMail).callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onidle();
                smtpClientStub.onready();
                smtpClientStub.ondone(true);
                smtpClientStub.onclose();
            });

            it('should not send due to build error', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';

                builderMock.encrypt.yieldsAsync();
                builderMock.buildEncrypted.yieldsAsync({});

                cb = function(err, rfcText) {
                    expect(err).to.exist;
                    expect(rfcText).to.not.exist;

                    expect(smtpClientStub.connect.called).to.be.false;

                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);
            });

            it('should not send due to encryption error', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';

                builderMock.encrypt.yieldsAsync({});

                cb = function(err, rfcText) {
                    expect(err).to.exist;
                    expect(rfcText).to.not.exist;

                    expect(smtpClientStub.connect.called).to.be.false;

                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.called).to.be.false;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);
            });
        });

        describe('send signed', function() {
            it('should send a signed message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                //
                // Setup Fixture
                //

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.buildSigned.yields(null, mockCompiledMail, mockEnvelope);

                cb = function(err, rfcText) {
                    expect(err).to.not.exist;
                    expect(rfcText).to.exist;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.withArgs(mockEnvelope).callCount).to.equal(1);
                    expect(smtpClientStub.end.withArgs(mockCompiledMail).callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.buildSigned.calledOnce).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: false,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg,
                    smtpclient: smtpClientStub
                }, cb);

                // fire event in the order smtpClient would
                smtpClientStub.onidle();
                smtpClientStub.onready();
                smtpClientStub.ondone(true);
                smtpClientStub.onclose();
            });
        });

        describe('encrypt', function() {
            it('should forward the call', function(done) {
                builderMock.encrypt.yieldsAsync();

                mailer.encrypt({}, function() {
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    done();
                });
            });
        });

    });
});