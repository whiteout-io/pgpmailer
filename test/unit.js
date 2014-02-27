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
        simplesmtp = require('simplesmtp');

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
        var mailer, smtpMock, builderMock, connectStub, opts;

        beforeEach(function() {
            builderMock = sinon.createStubInstance(PgpBuilder);

            smtpMock = sinon.createStubInstance(SmtpContructorMock);
            connectStub = sinon.stub(simplesmtp, 'connect', function() {
                return smtpMock;
            });

            opts = {
                host: 'hello.world.com',
                port: 1337,
                auth: {},
                secureConnection: true,
                tls: {
                    ca: ['trusty cert']
                }
            };

            mailer = new PgpMailer(opts, builderMock);
        });

        afterEach(function() {
            simplesmtp.connect.restore();
        });

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
            it('should encrypt and send an message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                smtpMock.on.withArgs('idle').yields();
                smtpMock.on.withArgs('message').yields();
                smtpMock.on.withArgs('ready').yields();

                builderMock.encrypt.yieldsAsync();
                builderMock.buildEncrypted.yieldsAsync(null, mockCompiledMail, mockEnvelope);

                cb = function(err) {
                    expect(err).to.not.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(connectStub.calledOnce).to.be.true;
                    expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                    expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                    expect(smtpMock.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpMock.end.calledOnce).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpMock.on.calledWith('idle')).to.be.true;
                    expect(smtpMock.on.calledWith('error')).to.be.true;
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
                }, cb);
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

                smtpMock.on.withArgs('idle').yields();
                smtpMock.on.withArgs('message').yields();
                smtpMock.on.withArgs('ready').yields();

                builderMock.encrypt.yieldsAsync();
                builderMock.buildEncrypted.yieldsAsync(null, mockCompiledMail, mockEnvelope);

                cb = function(err) {
                    expect(err).to.not.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.called).to.be.false;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(connectStub.calledOnce).to.be.true;
                    expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                    expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                    expect(smtpMock.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpMock.end.calledOnce).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpMock.on.calledWith('idle')).to.be.true;
                    expect(smtpMock.on.calledWith('error')).to.be.true;
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
                }, cb);
            });

            it('should not send due to build error', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';

                builderMock.encrypt.yieldsAsync();
                builderMock.buildEncrypted.yieldsAsync({});

                cb = function(err) {
                    expect(err).to.exist;

                    expect(connectStub.called).to.be.false;
                    
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
                }, cb);
            });

            it('should not send due to encryption error', function(done) {
                var cb, mockMail, mockKeys, mockCtMsg;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';

                builderMock.encrypt.yieldsAsync({});

                cb = function(err) {
                    expect(err).to.exist;

                    expect(connectStub.called).to.be.false;

                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.called).to.be.false;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
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

                smtpMock.on.withArgs('idle').yields();
                smtpMock.on.withArgs('message').yields();
                smtpMock.on.withArgs('ready').yields();

                builderMock.buildSigned.yieldsAsync(null, mockCompiledMail, mockEnvelope);

                cb = function(err) {
                    expect(err).to.not.exist;

                    // check that the smtp client was called with the right stuff
                    expect(connectStub.calledOnce).to.be.true;
                    expect(connectStub.calledWith(opts.port, opts.host, opts)).to.be.true;
                    expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                    expect(smtpMock.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpMock.end.calledOnce).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpMock.on.calledWith('idle')).to.be.true;
                    expect(smtpMock.on.calledWith('error')).to.be.true;
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.buildSigned.calledOnce).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: false,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
                }, cb);
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

        describe('reEncrypt', function() {
            it('should forward the call', function(done) {
                builderMock.reEncrypt.yieldsAsync();

                mailer.reEncrypt({}, function() {
                    expect(builderMock.reEncrypt.calledOnce).to.be.true;
                    done();
                });
            });
        });
    });
});