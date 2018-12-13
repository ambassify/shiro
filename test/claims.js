'use strict';

const assert = require('assert');

const Shiro = require('../lib');

function equalScope(a, b, ...args) {
    assert.deepEqual(
        Array.isArray(a) ? a.sort() : a,
        Array.isArray(b) ? b.sort() : b,
        ...args
    );
}

describe('# claims', function () {

    let permissions;

    beforeEach(() => { permissions = new Shiro(); })

    it('simple claim', function () {
        permissions.add('a:b');
        equalScope(permissions.claims, [ 'a:b' ]);
    });

    it('multiple claims', function () {
        permissions.add('a:b');
        permissions.add('c:d');

        equalScope(permissions.claims, [
            'a:b',
            'c:d'
        ]);
    });

    it('changing claims', function () {
        permissions.add('a:b');

        equalScope(permissions.claims, ['a:b']);

        permissions.add('c:d');

        equalScope(permissions.claims, [
            'a:b',
            'c:d'
        ]);
    });

    it('deduplicated claims', function () {
        permissions.add('a:b');
        permissions.add('a');

        equalScope(permissions.claims, [ 'a' ]);
    });

    it('star claim', function () {
        permissions.add('a:b');
        permissions.add('*');

        equalScope(permissions.claims, [ '*' ]);
    });

    it('no claims', function () {
        equalScope(permissions.claims, []);
    });

    it('should not return duplicate claims', function () {
        permissions.add([
            'create:image:b:post:a',
            'create:image:*:post:a',
            'read:message:b'
        ]);

        equalScope(permissions.claims, [
            'create:image:*:post:a',
            'read:message:b'
        ]);
    })

});
