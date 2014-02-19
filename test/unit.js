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
        var mailer, smtpMock, ready, builderMock;

        beforeEach(function() {
            var opts;

            builderMock = sinon.createStubInstance(PgpBuilder);

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

            mailer = new PgpMailer(opts, undefined, simplesmtp, builderMock);

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

        describe('smtp idle state', function() {
            it('should trigger the client', function() {
                ready(); // smtp enters idle mode and is ready to send stuff

                expect(mailer._busy).to.be.false; // now we should be ready to send
            });
        });

        describe('send', function() {
            it('should send an encrypted message with attachments', function(done) {
                var cb, mockMail, mockEncrypt, mockKeys, mockCtMsg, mockEnvelope, mockCompiledMail;

                //
                // Setup Fixture
                //

                mockMail = {};
                mockEncrypt = true;
                mockKeys = ['publicA', 'publicB', 'publicC', 'publicD', 'publicE'];
                mockCtMsg = 'hello!';
                mockEnvelope = {};
                mockCompiledMail = {};

                smtpMock.on.withArgs('message').yieldsAsync();
                smtpMock.on.withArgs('ready').yieldsAsync();

                builderMock.build.withArgs({
                    mail: mockMail,
                    encrypt: mockEncrypt,
                    cleartextMessage: mockCtMsg,
                    publicKeysArmored: mockKeys
                }).yieldsAsync(null, mockEnvelope, mockCompiledMail);

                cb = function(err) {
                    expect(err).to.not.exist;

                    // check that the smtp client was called with the right stuff
                    expect(smtpMock.useEnvelope.calledOnce).to.be.true;
                    expect(smtpMock.useEnvelope.calledWith(mockEnvelope)).to.be.true;
                    expect(smtpMock.end.calledOnce).to.be.true;
                    expect(smtpMock.end.calledWith(mockCompiledMail)).to.be.true;
                    expect(smtpMock.on.calledWith('message')).to.be.true;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.true;
                    expect(smtpMock.on.calledWith('ready')).to.be.true;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.build.calledOnce).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({
                    mail: mockMail,
                    encrypt: mockEncrypt,
                    publicKeysArmored: mockKeys,
                    cleartextMessage: mockCtMsg
                }, cb, builderMock);
                expect(mailer._queue.length).to.equal(1);
                ready();
            });

            it('should not send a message due to error', function(done) {
                builderMock.build.yieldsAsync({});
                
                var cb = function(err) {
                    expect(err).to.exist;

                    // check that the smtp client was called with the right stuff
                    expect(smtpMock.useEnvelope.called).to.be.false;
                    expect(smtpMock.end.called).to.be.false;
                    expect(smtpMock.on.calledWith('message')).to.be.false;
                    expect(smtpMock.on.calledWith('rcptFailed')).to.be.false;
                    expect(smtpMock.on.calledWith('ready')).to.be.false;

                    // check that the mailbuilder has built a clear text and a pgp mail and compiled the pgp mail
                    expect(builderMock.build.calledOnce).to.be.true;

                    done();
                };

                // queue the mail & execute test
                mailer.send({}, cb, builderMock);
                ready();
            });
        });
    });
});