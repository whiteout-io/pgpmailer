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
        PgpMailer = require("../src/pgpmailer");

    chai.Assertion.includeStack = true;

    describe('unit tests', function() {
        var mailer;

        beforeEach(function() {
            this.sinon = sinon.sandbox.create();

            mailer = new PgpMailer();
        });

        afterEach(function() {
            this.sinon.restore();
        });

        describe('initial setup', function() {
            it('should be correct', function() {
                expect(mailer).to.exist;
                expect(mailer._pgp).to.exist;
            });
        });
    });
});