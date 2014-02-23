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
                src: ['test/unit.js', 'test/local-integration.js']
            },
            integration: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/integration.js']
            },
            example: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/example.js']
            }
        },

        connect: {
            dev: {
                options: {
                    port: 8124,
                    base: '.',
                    keepalive: true
                }
            }
        },

        mocha_phantomjs: {
            all: {
                options: {
                    reporter: 'dot'
                },
                src: ['test/unit.html']
            }
        }
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // Tasks
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('default', ['jshint', 'mochaTest:all', 'mocha_phantomjs:all']);
    grunt.registerTask('example', ['jshint', 'mochaTest:example']);
    grunt.registerTask('integration', ['jshint', 'mochaTest:integration']);
};