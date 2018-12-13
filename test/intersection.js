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

describe('# intersection', function () {

    it('simple no intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('c:d');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, []);
    });

    it('simple intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('a:b');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, [ 'a:b' ]);
    });

    it('star intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('*');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, [ 'a:b' ]);
    });

    it('star-star intersection', function () {
        const a = Shiro.create('*');
        const b = Shiro.create('*');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, [ '*' ]);
    });

    it('sub-star intersection', function () {
        const a = Shiro.create('a:b');
        const b = Shiro.create('a:*');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, ['a:b']);
    });

    it('cross-star intersection', function () {
        const a = Shiro.create('*:b');
        const b = Shiro.create('a:*');

        const inter = Shiro.intersection(a, b);
        equalScope(inter.claims, ['a:b']);
    });

    it('random intersection', function () {
        const a = Shiro.create([ '*:b', 'a:*:c' ]);
        const b = Shiro.create([ 'a:*', 'd:b' ]);
        const c = Shiro.create('*');

        const inter = Shiro.intersection(a, b, c);

        equalScope(inter.claims, [
            'a:b',
            'a:*:c',
            'd:b',
        ]);
    })

    it('should not return duplicate entries', function () {
        const a = Shiro.create([
            'create:image:*:post:a',
            'read:message:b'
        ]);
        const b = Shiro.create('*');

        const inter = Shiro.intersection(a, b);

        equalScope(inter.claims, [
            // this used to include the following scope as well, which is not
            // incorrect but needlessly verbose
            // "create:image:b:post:a"

            'create:image:*:post:a',
            'read:message:b'
        ]);
    })

});
