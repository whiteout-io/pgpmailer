'use strict';

require.config({
    baseUrl: '.',
    paths: {
        'chai': '../node_modules/chai/chai',
        'sinon': '../node_modules/sinon/pkg/sinon-1.7.3',
        'pgpbuilder': '../node_modules/pgpbuilder/src/pgpbuilder',
        'mailbuild': '../node_modules/pgpbuilder/node_modules/mailbuild/src/mailbuild',
        'addressparser': '../node_modules/pgpbuilder/node_modules/mailbuild/node_modules/wo-addressparser/src/addressparser',
        'mimefuncs': '../node_modules/pgpbuilder/node_modules/mailbuild/node_modules/mimefuncs/src/mimefuncs',
        'mimetypes': '../node_modules/pgpbuilder/node_modules/mailbuild/node_modules/mimetypes/src/mimetypes',
        'punycode': '../node_modules/pgpbuilder/node_modules/mailbuild/node_modules/punycode/punycode',
        'smtpclient': '../node_modules/wo-smtpclient/src/smtpclient',
        'smtpclient-response-parser': '../node_modules/wo-smtpclient/src/smtpclient-response-parser',
        'tcp-socket': '../node_modules/wo-smtpclient/node_modules/tcp-socket/src/tcp-socket',
        'tcp-socket-tls': '../node_modules/wo-smtpclient/node_modules/tcp-socket/src/tcp-socket-tls',
        'stringencoding': '../node_modules/wo-smtpclient/node_modules/wo-stringencoding/dist/stringencoding',
        'axe': '../node_modules/wo-smtpclient/node_modules/axe-logger/axe',
        'openpgp': 'lib/openpgp.min',
        'forge': 'lib/forge.min'
    },
    shim: {
        'sinon': {
            exports: 'sinon'
        }
    }
});

// add function.bind polyfill
if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            FNOP = function() {},
            fBound = function() {
                return fToBind.apply(this instanceof FNOP && oThis ? this : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        FNOP.prototype = this.prototype;
        fBound.prototype = new FNOP();

        return fBound;
    };
}

mocha.setup('bdd');
if (window.mochaPhantomJS) {
    // the integration test does not work in phantomjs
    require(['unit'], function() {
        mochaPhantomJS.run();
    });
} else {
    require(['unit'], function() {
        mocha.run();
    });
}