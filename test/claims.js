'use strict';

const assert = require('assert');

const Shiro = require('../lib');

describe('# claims', function () {

    let permissions;

    beforeEach(() => { permissions = new Shiro(); })

    it('simple claim', function () {
        permissions.add('a:b');
        assert.deepEqual(permissions.claims, [ 'a:b' ]);
    });

    it('multiple claims', function () {
        permissions.add('a:b');
        permissions.add('c:d');

        assert.deepEqual(permissions.claims, [
            'a:b',
            'c:d'
        ]);
    });

    it('changing claims', function () {
        permissions.add('a:b');

        assert.deepEqual(permissions.claims, ['a:b']);

        permissions.add('c:d');

        assert.deepEqual(permissions.claims, [
            'a:b',
            'c:d'
        ]);
    });

    it('deduplicated claims', function () {
        permissions.add('a:b');
        permissions.add('a');

        assert.deepEqual(permissions.claims, [ 'a' ]);
    });

    it('star claim', function () {
        permissions.add('a:b');
        permissions.add('*');

        assert.deepEqual(permissions.claims, [ '*' ]);
    });

    it('no claims', function () {
        assert.deepEqual(permissions.claims, []);
    });

});
