'use strict';

const assert = require('assert');

const Shiro = require('../lib');

describe('# check', function () {

    let permissions;

    beforeEach(() => { permissions = new Shiro(); })

    it('simple permission', function () {
        permissions.add('a:b:c:d');
        assert(permissions.check('a:b:c:d'));
        assert(permissions.check('a:b:c:d:e'));
        assert(!permissions.check('a:b'));
        assert(!permissions.check('a:b:d'));
        assert(!permissions.check('a:b:c:e'));
    });

    it('star permission', function () {
        permissions.add('a:*');
        assert(permissions.check('a:b'));
        assert(permissions.check('a:b:c'));
        assert(permissions.check('a:*'));
        assert(permissions.check('a:b:*'));
        assert(permissions.check('a:*:c'));
        assert(!permissions.check('b:c'));
        assert(!permissions.check('*'));
        assert(!permissions.check('b:*'));
    });

    it('star-only permission', function () {
        permissions.add('*');
        assert(permissions.check('a'));
        assert(permissions.check('a:b'));
        assert(permissions.check('*'));
    });

    it('multiple star permission', function () {
        assert(Shiro.create('*:*').check('l1:l2:l3:l4:l5'));
        assert(Shiro.create('*:*').check('l1:l2'));
        assert(Shiro.create('*:*').check('l1'));
        assert(Shiro.create('*:*:*').check('l1:l2:l3:l4:l5'));
        assert(Shiro.create('*:*:*').check('l1:l2:l3'));
        assert(Shiro.create('*:*:*').check('l1:l2'));
        assert(Shiro.create('*:*:*').check('l1'));
        assert(Shiro.create('newsletter:*:*').check('newsletter:edit'));
        assert(Shiro.create('newsletter:*:*').check('newsletter:edit:*'));
        assert(Shiro.create('newsletter:*:*').check('newsletter:edit:12'));
    });

    it('implicit star permission', function () {
        permissions.add('a');
        assert(permissions.check('a:b'));
        assert(permissions.check('a:b:c'));
        assert(permissions.check('a:*'));
        assert(permissions.check('a:b:*'));
        assert(permissions.check('a:*:c'));
        assert(!permissions.check('b:c'));
        assert(!permissions.check('*'));
        assert(!permissions.check('b:*'));
    });

    it('comma permission', function () {
        permissions.add('a:b,c:d');
        assert(permissions.check('a:b:d'));
        assert(permissions.check('a:c:d'));
    });

    it('multiple permissions', function () {
        permissions = Shiro.create('a:b:*:x,y').add('a:b,c,*');
        assert(permissions.check('a:b:d:x'));
        assert(permissions.check('a:b:d:z'));

        permissions = Shiro.create('a:b:*:x,y').add('a:b,c');
        assert(permissions.check('a:b:d:x'));
        assert(permissions.check('a:b:d:z'));
    })

    it('should fix the bug we had in shiro-trie library', function() {
        assert(!Shiro.create([ '*:user:foo', '*:*:*:user:foo' ]).check('read'));
    })

    describe('various checkes', function () {
        it('test1', function () {
            assert(Shiro.create('l1:l2:*').check('l1:l2:l3'));
        });
        it('test2', function () {
            assert(Shiro.create('l1:l2:*').check('l1:l2'));
        });
        it('test3', function () {
            assert(Shiro.create('l1:l2:*:*:*').check('l1:l2:l3:l4:l5'));
        });
        it('test4', function () {
            assert(Shiro.create('l1').check('l1:l2:l3'));
        });
        it('test5', function () {
            assert(Shiro.create('l1:l2').check('l1:l2:l3'));
        });
        it('test6', function () {
            assert(!Shiro.create('l1:l2').check('l1'));
        });
        it('test7', function () {
            assert(Shiro.create('l1:a,b,c:l3').check('l1:a:l3'));
        });
        it('test8', function () {
            assert(!Shiro.create('l1:a,b,c:d,e,f').check('l1:a:l3'));
        });
        it('test9', function () {
            assert(Shiro.create('l1:a,b,c:d,e,f').check('l1:a:f'));
        });
        it('test10', function () {
            assert(Shiro.create('l1:*:l3').check('l1:l2:l3'));
        });
        it('test11', function () {
            assert(!Shiro.create('l1:*:l3').check('l1:l2:error'));
        });
        it('test12', function () {
            assert(!Shiro.create('l1:*:l3').check('l1:l2'));
        });
        it('test13', function () {
            assert(Shiro.create('*:l2').check('l1:l2'));
        });
        it('test14', function () {
            assert(!Shiro.create('*:l2').check('l1:error'));
        });
        it('test15', function () {
            assert(Shiro.create('*:l2:l3').check('l1:l2:l3'));
        });
        it('test16', function () {
            assert(Shiro.create('*:l2:l3').check('l1:l2:l3:l4'));
        });
        it('test17', function () {
            assert(Shiro.create('*:*:l3').check('l1:l2:l3'));
        });
        it('test18', function () {
            assert(Shiro.create('*:*:l3').check('l1:l2:l3:l4'));
        });
        it('test19', function () {
            assert(!Shiro.create('*:*:l3').check('l1:l2:error:l4'));
        });
        it('test20', function () {
            assert(!Shiro.create('newsletter:view,create,edit,delete').check('newsletter:view,create,any,edit,delete'));
        });
        it('test21', function () {
            assert(Shiro.create('acc:perm:*').check('acc:perm:x:y:z,1,2'));
        });
        it('test22', function () {
            assert(!Shiro.create('acc:perm:x:y:z').check('acc:perm:x:y:z,1,2'));
        });
        it('test23', function () {
            assert(Shiro.create('acc:perm').check('acc:perm:x,a:y:z,1,2'));
        });
        it('test24', function () {
            assert(Shiro.create('acc:perm').check('acc:perm:x,a:*:z,1,2'));
        });
        it('test25', function () {
            assert(!Shiro.create('acc:perm:x:y:z').check('acc:perm:x:*:z'));
        });
        it('test26 (no overwrite when adding comma after star)', function () {
            assert(Shiro.create('a:b:c:d,e').add('a:b:*:d').check('a:b:c:e'));
        });
        it('test27 (no overwrite when adding something after star)', function () {
            assert(Shiro.create('a:b').add('a:b:c:d').check('a:b:c:e'));
        });
    });
});
