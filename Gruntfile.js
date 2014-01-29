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
            }
        }

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
    // grunt.registerTask('dev', ['connect:dev']);
    // grunt.registerTask('default', ['jshint', 'connect:test', 'mochaTest', 'mocha_phantomjs']);
    grunt.registerTask('default', ['jshint', 'mochaTest']);
};
