'use strict';

if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    var PgpMailer = require('../src/pgpmailer'),
        chai = require('chai'),
        expect = chai.expect;

    chai.Assertion.includeStack = true;

    describe('send', function() {
        it('should work', function(done) {
            this.timeout(60000);

            var privKeyArmored = '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\n' +
                'Version: OpenPGP.js v.1.20131116\r\n' +
                'Comment: Whiteout Mail - http://whiteout.io\r\n' +
                '\r\n' +
                'xcL+BFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\n' +
                'qeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\n' +
                'xTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\n' +
                'KgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\n' +
                'nkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\n' +
                'YPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\n' +
                'AAH+AwMI8l5bp5J/xgpguvHaT2pX/6D8eU4dvODsvYE9Y4Clj0Nvm2nu4VML\r\n' +
                'niNb8qpzCXXfFqi1FWGrZ2msClxA1eiXfk2IEe5iAiY3a+FplTevBn6rkAMw\r\n' +
                'ly8wGyiNdE3TVWgCEN5YRaTLpfV02c4ECyKk713EXRAtQCmdty0yxv5ak9ey\r\n' +
                'XDUVd4a8T3QMgHcAOTXWMFJNUjeeiIdiThDbURJEv+9F+DW+4w5py2iw0PYJ\r\n' +
                'Nm6iAHCjoPQTbGLxstl2BYSocZWxG1usoPKhbugGZK0Vr8rdpsfakjJ9cJUg\r\n' +
                'YHIH3VT+y+u5mhY681NrB5koRUxDT6ridbytMcoK8xpqYG3FhC8CiVnzpDQ3\r\n' +
                'o1KRkWuxUq66oJhu0wungXcqaDzDUEfeUjMuKVI/d9/ViXy8IH/XdlOy0lLY\r\n' +
                'Oac0ovRjb7zgeVOp2e7N4eTu0dts3SE+Do1gyqZo2rf1dwsJQI9YUtpjYAtr\r\n' +
                'NBkKyRvBAhg9KPh1y2Y1u3ra5OS0yGuNDD8pXdiN3kxMt5OBlnWeFjL6ll7+\r\n' +
                'vgiKZooPUZPbFIWi4XBXTv7D5T9THDYmuJpcOffn1AA7j2FM8fkFvtiFyw9J\r\n' +
                '2S14penv2R7TeybxR6ktD7HtZd34gmGvmOxhWRNU/vfp4SisUcu9jzQq+cJt\r\n' +
                'joWuJiZ8xvWEC2DD32n9bWyIlGhS4hATqz/gEdSha8hxzT+GJi29jYjp8Hnc\r\n' +
                '9HwxOArz6Q5h/nDN2Xt5PuCM65J0dathzAm0A7BLRQI+4OjTW575sRKvarzH\r\n' +
                '8JZ+UYK2BgP4Kbh9JqhnD/2NKD/csuL6No5guyOH8+zekdBtFE394SV8e9N+\r\n' +
                'zYgzVex4SDG8y/YO7W7Tp6afNb+sqyzEw5Bknypn0Hc3cr9wy1P8jLMM2woL\r\n' +
                'GRDZ5IutCAV/D/h881dHJs0tV2hpdGVvdXQgVXNlciA8c2FmZXdpdGhtZS50\r\n' +
                'ZXN0dXNlckBnbWFpbC5jb20+wsBcBBABCAAQBQJSjg7aCRDX+5P837/CPAAA\r\n' +
                '3ZwH/2AVGYB+8RDarP5a5uZPYSxJKeM8zHMbi7LKQWhr5NpkJajZdra1CCGZ\r\n' +
                'TXTeQSRBvU4SNGOmDAlhf0qCGeXwMHIzrzovkBedHIc/vypEkItdJeXQAaJx\r\n' +
                'uhQOnmyi9priuzBBx4e9x1aBn+aAdNGiJB4l13L2T4fow8WLIVpVwXB6BWya\r\n' +
                'lz50JwLzJP6qHxkhvIZElTrQ+Yoo3stS6w/7wNtK/f3MIYkIGVVUrIDgzN0X\r\n' +
                'm4z6ypN1dsrM6tPkMZ0JlqjHiz7DXpKrWsfNkoVZ9A98osMH2nIDS58JVEDc\r\n' +
                'AXoFSLsbdmqFmIc2Ew828TjlX+FLU9tlx89WhSMTapzUjHU=\r\n' +
                '=wxuK\r\n' +
                '-----END PGP PRIVATE KEY BLOCK-----';

            var pubkeyArmored = '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\n' +
                'Version: OpenPGP.js v.1.20131116\r\n' +
                'Comment: Whiteout Mail - http://whiteout.io\r\n' +
                '\r\n' +
                'xsBNBFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\n' +
                'qeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\n' +
                'xTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\n' +
                'KgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\n' +
                'nkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\n' +
                'YPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\n' +
                'AAHNLVdoaXRlb3V0IFVzZXIgPHNhZmV3aXRobWUudGVzdHVzZXJAZ21haWwu\r\n' +
                'Y29tPsLAXAQQAQgAEAUCUo4O2gkQ1/uT/N+/wjwAAN2cB/9gFRmAfvEQ2qz+\r\n' +
                'WubmT2EsSSnjPMxzG4uyykFoa+TaZCWo2Xa2tQghmU103kEkQb1OEjRjpgwJ\r\n' +
                'YX9Kghnl8DByM686L5AXnRyHP78qRJCLXSXl0AGicboUDp5sovaa4rswQceH\r\n' +
                'vcdWgZ/mgHTRoiQeJddy9k+H6MPFiyFaVcFwegVsmpc+dCcC8yT+qh8ZIbyG\r\n' +
                'RJU60PmKKN7LUusP+8DbSv39zCGJCBlVVKyA4MzdF5uM+sqTdXbKzOrT5DGd\r\n' +
                'CZaox4s+w16Sq1rHzZKFWfQPfKLDB9pyA0ufCVRA3AF6BUi7G3ZqhZiHNhMP\r\n' +
                'NvE45V/hS1PbZcfPVoUjE2qc1Ix1\r\n' +
                '=7Wpe\r\n' +
                '-----END PGP PUBLIC KEY BLOCK-----';

            var mailer = new PgpMailer({
                host: 'smtp.gmail.com',
                port: 465,
                auth: {
                    user: 'safewithme.testuser',
                    pass: 'hellosafe'
                },
                secureConnection: true,
                tls: {
                    ca: ['-----BEGIN CERTIFICATE-----\nMIIEBDCCAuygAwIBAgIDAjppMA0GCSqGSIb3DQEBBQUAMEIxCzAJBgNVBAYTAlVT\nMRYwFAYDVQQKEw1HZW9UcnVzdCBJbmMuMRswGQYDVQQDExJHZW9UcnVzdCBHbG9i\nYWwgQ0EwHhcNMTMwNDA1MTUxNTU1WhcNMTUwNDA0MTUxNTU1WjBJMQswCQYDVQQG\nEwJVUzETMBEGA1UEChMKR29vZ2xlIEluYzElMCMGA1UEAxMcR29vZ2xlIEludGVy\nbmV0IEF1dGhvcml0eSBHMjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nAJwqBHdc2FCROgajguDYUEi8iT/xGXAaiEZ+4I/F8YnOIe5a/mENtzJEiaB0C1NP\nVaTOgmKV7utZX8bhBYASxF6UP7xbSDj0U/ck5vuR6RXEz/RTDfRK/J9U3n2+oGtv\nh8DQUB8oMANA2ghzUWx//zo8pzcGjr1LEQTrfSTe5vn8MXH7lNVg8y5Kr0LSy+rE\nahqyzFPdFUuLH8gZYR/Nnag+YyuENWllhMgZxUYi+FOVvuOAShDGKuy6lyARxzmZ\nEASg8GF6lSWMTlJ14rbtCMoU/M4iarNOz0YDl5cDfsCx3nuvRTPPuj5xt970JSXC\nDTWJnZ37DhF5iR43xa+OcmkCAwEAAaOB+zCB+DAfBgNVHSMEGDAWgBTAephojYn7\nqwVkDBF9qn1luMrMTjAdBgNVHQ4EFgQUSt0GFhu89mi1dvWBtrtiGrpagS8wEgYD\nVR0TAQH/BAgwBgEB/wIBADAOBgNVHQ8BAf8EBAMCAQYwOgYDVR0fBDMwMTAvoC2g\nK4YpaHR0cDovL2NybC5nZW90cnVzdC5jb20vY3Jscy9ndGdsb2JhbC5jcmwwPQYI\nKwYBBQUHAQEEMTAvMC0GCCsGAQUFBzABhiFodHRwOi8vZ3RnbG9iYWwtb2NzcC5n\nZW90cnVzdC5jb20wFwYDVR0gBBAwDjAMBgorBgEEAdZ5AgUBMA0GCSqGSIb3DQEB\nBQUAA4IBAQA21waAESetKhSbOHezI6B1WLuxfoNCunLaHtiONgaX4PCVOzf9G0JY\n/iLIa704XtE7JW4S615ndkZAkNoUyHgN7ZVm2o6Gb4ChulYylYbc3GrKBIxbf/a/\nzG+FA1jDaFETzf3I93k9mTXwVqO94FntT0QJo544evZG0R0SnU++0ED8Vf4GXjza\nHFa9llF7b1cq26KqltyMdMKVvvBulRP/F/A8rLIQjcxz++iPAsbw+zOzlTvjwsto\nWHPbqCRiOwY1nQ2pM714A5AuTHhdUDqB1O6gyHA43LL5Z/qHQF1hwFGPa4NrzQU6\nyuGnBXj8ytqU0CwIPX4WecigUCAkVDNx\n-----END CERTIFICATE-----']
                },
                onError: function(error) {
                    console.error(error);
                }
            });

            var publicKeysArmored = [pubkeyArmored];
            var mail = {
                from: ['safewithme.testuser@gmail.com'],
                to: ['safewithme.testuser@gmail.com'],
                subject: 'hello, pgp',
                body: 'hello, world!',
                attachments: [{
                    contentType: 'text/plain',
                    fileName: 'foobar.txt',
                    uint8Array: utf16ToUInt8Array('I AM THE MIGHTY ATTACHMENT!')
                }]
            };
            var cleartextMessage = 'This message is prepended to your encrypted message and displayed in the clear even if your recipient does not speak PGP!';

            mailer.setPrivateKey({
                privateKeyArmored: privKeyArmored,
                passphrase: 'passphrase'
            }, function(err) {
                expect(err).to.not.exist;

                send();
            });

            function send() {
                mailer.send({
                    mail: mail,
                    encrypt: true,
                    publicKeysArmored: publicKeysArmored,
                    cleartextMessage: cleartextMessage
                }, function(err) {
                    expect(err).to.not.exist;
                });

                mailer.send({
                    mail: mail,
                    encrypt: true,
                    publicKeysArmored: publicKeysArmored,
                    cleartextMessage: cleartextMessage
                }, function(err) {
                    expect(err).to.not.exist;

                    done();
                });
            }

            mailer.login();
        });
    });

    //
    // Helper Functions
    //
    function utf16ToUInt8Array(str) {
        var bufView = new Uint16Array(new ArrayBuffer(str.length * 2));
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }
});