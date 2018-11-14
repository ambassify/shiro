'use strict';

const assert = require('assert');

const Shiro = require('../lib');

describe('# intersection', function () {

    it('simple no intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('c:d');

        const inter = Shiro.intersection(a, b);
        assert.deepEqual(inter.claims, []);
    });

    it('simple intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('a:b');

        const inter = Shiro.intersection(a, b);
        assert.deepEqual(inter.claims, [ 'a:b' ]);
    });

    it('star intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('*');

        const inter = Shiro.intersection(a, b);
        assert.deepEqual(inter.claims, [ 'a:b' ]);
    });

    it('sub-star intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('a:*');

        const inter = Shiro.intersection(a, b);
        assert.deepEqual(inter.claims, ['a:b']);
    });

    it('cross-star intersection', function () {
        const a = Shiro.create('*:b');
        const b = Shiro.create('a:*');

        const inter = Shiro.intersection(a, b);
        assert.deepEqual(inter.claims, ['a:b']);
    });

    it.only('random intersection', function () {
        const a = Shiro.create([ '*:b', 'a:*:c' ]);
        const b = Shiro.create([ 'a:*', 'd:b' ]);
        const c = Shiro.create('*');

        const inter = Shiro.intersection(a, b, c);

        assert.deepEqual(inter.claims, [
            'a:b',
            'a:*:c',
            'd:b',
        ]);
    })

});
