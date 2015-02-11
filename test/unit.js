'use strict';

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        ES6Promise.polyfill(); // load ES6 Promises polyfill
        define(['sinon', 'chai', '../src/pgpmailer', 'pgpbuilder', 'smtpclient'], factory);
    } else if (typeof exports === 'object') {
        require('es6-promise').polyfill(); // load ES6 Promises polyfill
        module.exports = factory(require('sinon'), require('chai'), require('../src/pgpmailer'), require('pgpbuilder'), require('wo-smtpclient'));
    }
}(function(sinon, chai, PgpMailer, PgpBuilder, SmtpClient) {
    var expect = chai.expect;
    chai.Assertion.includeStack = true;

    describe('unit tests', function() {
        var mailer, smtpClientStub, builderMock, opts;

        beforeEach(function() {
            opts = {
                host: 'hello.world.com',
                port: 1337,
                auth: {},
                ignoreTLS: false,
                secure: true,
                ca: ['trusty cert']
            };

            builderMock = sinon.createStubInstance(PgpBuilder);
            smtpClientStub = sinon.createStubInstance(SmtpClient);
            mailer = new PgpMailer(opts, builderMock);
        });

        afterEach(function() {});

        describe('set private key', function() {
            it('should set the private key', function(done) {
                builderMock.setPrivateKey.withArgs({}).returns(resolves());

                mailer.setPrivateKey({}).then(function() {
                    expect(builderMock.setPrivateKey.calledOnce).to.be.true;
                    done();
                });
            });

            it('should not set the private key due to error', function(done) {
                builderMock.setPrivateKey.returns(rejects());

                mailer.setPrivateKey({}).catch(function() {
                    expect(builderMock.setPrivateKey.calledOnce).to.be.true;
                    done();
                });
            });
        });

        describe('send encrypted', function() {
            it('should should fail due to error in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function() {
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
                    smtpclient: smtpClientStub
                }).catch(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onerror(new Error('Boom!'));
                }, 0);
            });

            it('should should fail due to failedRecipients in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function() {
                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(1);
                    expect(smtpClientStub.end.callCount).to.equal(0);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).catch(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onidle();
                    smtpClientStub.onready('Failed recipients!');
                }, 0);
            });

            it('should should fail due to unsucessful ondone in smtp client', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function() {
                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(1);
                    expect(smtpClientStub.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpClientStub.end.callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).catch(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onidle();
                    smtpClientStub.onready();
                    smtpClientStub.ondone(false);
                }, 0);
            });

            it('should encrypt and send an message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function(rfcText) {
                    expect(rfcText).to.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(1);
                    expect(smtpClientStub.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpClientStub.end.callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).then(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onidle();
                    smtpClientStub.onready();
                    smtpClientStub.ondone(true);
                    smtpClientStub.onclose();
                }, 0);
            });

            it('should send a previously encrypted message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                mockMail = {
                    encrypted: true
                };
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function(rfcText) {
                    expect(rfcText).to.exist;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.encrypt.called).to.be.false;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(1);
                    expect(smtpClientStub.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpClientStub.end.callCount).to.equal(1);
                    expect(smtpClientStub.quit.callCount).to.equal(1);

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).then(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onidle();
                    smtpClientStub.onready();
                    smtpClientStub.ondone(true);
                    smtpClientStub.onclose();
                }, 0);
            });

            it('should not send due to build error', function(done) {
                var cb, mockMail, mockKeys;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];

                builderMock.encrypt.returns(resolves());
                builderMock.buildEncrypted.returns(rejects());

                cb = function() {
                    expect(smtpClientStub.connect.called).to.be.false;
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.calledOnce).to.be.true;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).catch(cb);
            });

            it('should not send due to encryption error', function(done) {
                var cb, mockMail, mockKeys;

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];

                builderMock.encrypt.returns(rejects());

                cb = function() {
                    expect(smtpClientStub.connect.called).to.be.false;
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    expect(builderMock.buildEncrypted.called).to.be.false;

                    done();
                };

                mailer.send({
                    mail: mockMail,
                    encrypt: true,
                    publicKeysArmored: mockKeys,
                    smtpclient: smtpClientStub
                }).catch(cb);
            });
        });

        describe('send signed', function() {
            it('should send a signed message with attachments', function(done) {
                var cb, mockMail, mockKeys, mockEnvelope, mockCompiledMail;

                //
                // Setup Fixture
                //

                mockMail = {};
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockEnvelope = {};
                mockCompiledMail = {};

                builderMock.buildSigned.returns(resolves({
                    rfcMessage: mockCompiledMail,
                    smtpInfo: mockEnvelope
                }));

                cb = function(rfcText) {
                    expect(rfcText).to.exist;

                    // check that the smtp client was called with the right stuff
                    expect(smtpClientStub.connect.callCount).to.equal(1);
                    expect(smtpClientStub.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpClientStub.useEnvelope.callCount).to.equal(1);
                    expect(smtpClientStub.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpClientStub.end.callCount).to.equal(1);
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
                    smtpclient: smtpClientStub
                }).then(cb);

                // fire event in the order smtpClient would
                setTimeout(function() {
                    smtpClientStub.onidle();
                    smtpClientStub.onready();
                    smtpClientStub.ondone(true);
                    smtpClientStub.onclose();
                }, 0);
            });
        });

        describe('encrypt', function() {
            it('should forward the call', function(done) {
                builderMock.encrypt.returns(resolves());

                mailer.encrypt({}).then(function() {
                    expect(builderMock.encrypt.calledOnce).to.be.true;
                    done();
                });
            });
        });

    });

    function resolves(val) {
        return new Promise(function(res) {
            res(val);
        });
    }

    function rejects(val) {
        return new Promise(function(res, rej) {
            rej(val || new Error());
        });
    }
}));