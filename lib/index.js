'use strict';

function addClaim(trie, [ claim, ...remaining ]) {
    claim.split(',').forEach(part => {
        // there is already a wildcard permission at this level, no need to go
        // any deeper
        if (trie[part] && !Object.keys(trie[part]).length)
            return;

        if (!trie[part])
            trie[part] = {};

        if (remaining.length)
            addClaim(trie[part], remaining);
        else
            trie[part] = {}; // last part of claim means everything deeper is implied ":*"
    });
}

function checkPermission(trie, [ permission, ...remaining ]) {
    return permission.split(',').every(part => {
        const wildcard = trie['*'];
        const exact = trie[part];

        // permission check matches an end-node; everything deeper is implied allowed
        if (
            (wildcard && !Object.keys(wildcard).length) ||
            (exact && !Object.keys(exact).length)
        ) return true;

        // a:b
        // a:b:*:*:*:*
        if (!remaining.length)
            return false;

        return (
            (wildcard && checkPermission(wildcard, remaining)) ||
            (exact && checkPermission(exact, remaining)) ||
            false
        );
    });
}

class Shiro {

    static create(claims) {
        return new Shiro(claims);
    }

    constructor(claims) {
        Object.defineProperty(this, 'trie', { value: {} });
        this.add(claims);
    }

    add(claims) {
        if (claims && typeof claims == 'string')
            claims = [ claims ];

        if (Array.isArray(claims)) {
            claims.forEach(claim => {
                if (typeof claim !== 'string')
                    return;

                // strip ":*" at the end, it is implied
                claim = claim.replace(/(:\*)*$/, '');
                claim = claim.split(':');
                addClaim(this.trie, claim);
            });
        }

        return this;
    }

    check(permission) {
        if (!permission || typeof permission !== 'string')
            return false;

        return checkPermission(this.trie, permission.split(':'));
    }
}

module.exports = Shiro;
