# pgpmailer

**mailbuilder** is high-level module to send pgp-encrypted messages in node and certain browser runtimes.

[![Build Status](https://travis-ci.org/whiteout-io/pgpmailer.png?branch=master)](https://travis-ci.org/whiteout-io/pgpmailer)

## PGP/MIME in the browser?! Yes.

Thanks to all those who made this possible! This module orchestrates the following libraries to send PGP-encrypted messages:
* [OpenPGP.js](http://openpgpjs.org/)
* [simplesmtp](https://github.com/andris9/simplesmtp)
* [mailbuilder](https://github.com/whiteout-io/mailbuilder)
* [node-shims](https://github.com/whiteout-io/node-shims)

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

**NB! text/html is not yet supported, but we're working hard to make it happen**

This lib takes your mail object, creates the MIME-tree, signs and encrypts it, and build a PGP/MIME message that looks like this:

    multipart/encrypted
    |___application/pgp-encrypted
    |___inline attachment (pgp block)

## How do I use this?

Have a look at the example file, enter your credentials and keys and then

    grunt example

Here's what you do in you own app

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
        },
        privateKey: 'ASCII ARMORED PRIVATE KEY',
        passphrase: 'PASSPHRASE'

    });

    var armoredPublicKeys = ['ASCII ARMORED PUBLIC KEY OF THE SENDER', 'RECEIVER KEY', 'ANOTHER RECEIVER KEY', 'COPY RECEIVER KEY', 'BLINDCOPY RECEIVER KEY'];
    var mail = {
        from: 'sender@foobar.com',
        to: ['recipient@foobar.com', 'another_recipient@foobar.com'],
        cc: ['receive.a.copy@foobar.com'],
        bcc: ['blindcopy@foobar.com'],
        subject: 'hello, pgp',
        text: 'hello, world!',
        attachments: [{
            contentType: 'text/plain',
            fileName: 'a.txt',
            uint8Array: // a UInt8Array that contains your attachment
        }]
    };
    mailer.send(mail, armoredPublicKeys, function(error) {
        // do something useful with the error
    });

## Get your hands dirty

    npm install && grunt
