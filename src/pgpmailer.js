'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var pgp = require('openpgp');

    var Mailbuilder = function(openpgp){
        this._pgp = openpgp || pgp;
    };

    return Mailbuilder;
});