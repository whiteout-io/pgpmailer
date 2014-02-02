module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: ['*.js', 'src/*.js', 'test/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        mochaTest: {
            all: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/unit.js']
            },
            example: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/example.js']
            }
        },

        // phantomjs is unusable due to a bug: 
        // '[object Uint16Array]' is not a valid argument for 'Function.prototype.apply'
        // see https://github.com/ariya/phantomjs/issues/11172
        // 
        // connect: {
        //     test: {
        //         options: {
        //             port: 8123,
        //             base: '.'
        //         }
        //     },
        //     dev: {
        //         options: {
        //             port: 8124,
        //             base: '.',
        //             keepalive: true
        //         }
        //     }
        // },

        // mocha_phantomjs: {
        //     all: {
        //         options: {
        //             reporter: 'dot'
        //         },
        //         src: ['test/unit.html']
        //     }
        // }
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    // grunt.loadNpmTasks('grunt-mocha-phantomjs');
    // grunt.loadNpmTasks('grunt-contrib-connect');

    // Tasks
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('default', ['jshint', 'mochaTest:all'/*, 'connect:test', 'mocha_phantomjs:all'*/]);
    grunt.registerTask('example', ['jshint', 'mochaTest:example']);
};