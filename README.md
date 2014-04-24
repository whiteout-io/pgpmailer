# pgpmailer

**mailbuilder** is high-level module to send pgp-encrypted messages in node and certain browser runtimes.

[![Build Status](https://travis-ci.org/whiteout-io/pgpmailer.png?branch=master)](https://travis-ci.org/whiteout-io/pgpmailer)

## PGP/MIME in the browser?! Yes.

This module orchestrates the following libraries to send PGP-encrypted messages:
* [OpenPGP.js](http://openpgpjs.org/)
* [smtpclient](https://github.com/whiteout-io/smtp-client)
* [pgpbuilder](https://github.com/whiteout-io/pgpbuilder)

## What can this library do?

This library takes a plain-text message including attachments and transforms it into an [RFC 3156](http://tools.ietf.org/search/rfc3156) format. Here's a little primer about RFC 3156.

An eMail consist from MIME-nodes. A MIME-node has information about what it contains, may this be other MIME-nodes, text, attachments, blabla. What goes over the wire when you send an email is mainly [some SMTP stuff](http://blog.nodeknockout.com/post/34641712180/sending-email-from-node-js) and the flattened MIME-Tree transformed to plain 7-bit ASCII. Here are some examples of how a MIME-Tree could look like. Plain-text mail

    envelope stuff ... yaddayadda ...
    text/plain

A text/plain mail with attachments is a bit more interesting, it should like this

    envelope stuff ...
    multipart/mixed
    |___text/plain
    |___application/octet/stream
    |___application/octet/stream
    |___application/octet/stream

An html-mail is nested even further

    envelope stuff ...
    multipart/mixed
    |___multipart/alternative
    |   |___text/plain
    |   |___text/html
    |___application/octet/stream
    |___application/octet/stream
    |___application/octet/stream

**NB! text/html is not yet supported, but we're working hard to make it happen. Also, PRs are welcome :)**

This lib takes your mail object, creates the MIME-tree, signs and encrypts it, and build a PGP/MIME message that looks like this:

    multipart/encrypted
    |___application/pgp-encrypted
    |___inline attachment (pgp block)

## How do I use this?

Here's what you do in you own app (and/or have a look at the `test/integration.js` test)

    var PgpMailer = require('pgpmailer');
    var pgpmailer = new PgpMailer({
        host: 'HOST',
        port: 465, // or whatever port you want to use
        auth: {
            user: 'YOUR USERNAME',
            pass: 'YOUR PASSWORD'
        },
        secureConnection: true, // because why wouldn't you?
        tls: {
            ca: ['PIN THE CERTIFICATE OF YOUR PROVIDER OF CHOICE'] // because why wouldn't you?
        }
    });

    // set your private key to sign your message
    pgpmailer.setPrivateKey({
        privateKeyArmored: 'ASCII ARMORED PRIVATE KEY',
        passphrase: 'PASSPHRASE'
    }, function(error) {
        // do something useful with the error
    });

    // execute this after pgpmailer.setPrivateKey invoked its callback and the private key is set
    var publicKeysArmored = ['ASCII ARMORED PUBLIC KEY OF THE SENDER', 'RECEIVER KEY', 'COPY RECEIVER KEY', 'BLINDCOPY RECEIVER KEY'];
    var mail = {
        from: [{
            name: 'Foo Bar',
            address: 'sender@foobar.com'
        }],
        to: [{
            name: 'Foo Bar',
            address: 'recipient@foobar.com'
        }],
        cc: [{
            name: 'Foo Bar',
            address: 'receive.a.copy@foobar.com'
        }],
        subject: 'hello, pgp',
        body: 'hello, world!',
        attachments: [{
            mimeType: 'text/plain',
            filename: 'a.txt',
            content: // a UInt8Array that contains your attachment
        }]
    };
    var cleartextMessage = 'This message is prepended to your encrypted message and displayed in the clear even if your recipient does not speak PGP!';

    mailer.send({
        mail: mail,
        encrypt: true,
        publicKeysArmored: publicKeysArmored,
        cleartextMessage: cleartextMessage
    }, function(error) {
        // do something useful with the error
    });


If you **do not want to encrypt** your message, but instead just want to sign it, just do the following

    // instantiate the pgpmailer and set your public key, then
    mailer.send({
        mail: mail,
        encrypt: false
    }, function(error) {
        // do something useful with the error
    });

## Get your hands dirty

    npm install && grunt
