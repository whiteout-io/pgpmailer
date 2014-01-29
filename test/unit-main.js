'use strict';

require.config({
    baseUrl: '.',
    paths: {
        'chai': '../node_modules/chai/chai'
    }
});

mocha.setup('bdd');
require(['unit'], function() {
    if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
    } else {
        mocha.run();
    }
});