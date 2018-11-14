'use strict';

const END = Symbol('END_NODE');

function addClaim(trie, parts) {
    // reached the end of claims, anything deeper is implicitly allowed; OR
    // reached an end node in the tree, anything deeper was already allowed
    if (!parts.length || trie === END)
        return END;

    trie = trie || {};

    parts.shift().split(',').forEach(part => {
        trie[part] = addClaim(trie[part], parts.slice());
    });

    return trie;
}

function checkPermission(trie, parts) {
    // we reached an end-node of trie, which implies everything deeper is allowed
    if (trie === END)
        return true;

    // reached the end of permissions request, which implies everything deeper should
    // also be allowed, but it is not since we did not reach an end-node oth the trie
    if (!parts.length)
        return false;

    // trie is empty but permissions were asked for
    if (!trie)
        return false;

    return parts.shift().split(',').every(part => {
        const wildcard = trie['*'];
        const exact = trie[part];

        return (
            (wildcard && checkPermission(wildcard, parts.slice())) ||
            (exact && checkPermission(exact, parts.slice()))
        ) || false;
    });
}

class Shiro {

    static create(claims) {
        return new Shiro(claims);
    }

    constructor(claims) {
        Object.defineProperty(this, 'trie', { value: null, writable: true });
        this.add(claims);
    }

    add(claims) {
        if (claims && typeof claims == 'string')
            claims = [ claims ];

        if (Array.isArray(claims)) {
            claims.forEach(claim => {
                if (!claim || typeof claim !== 'string')
                    return;

                // strip ":*" at the end, it is implied
                claim = claim.replace(/(^\*)?(:\*)*$/, '');
                claim = claim ? claim.split(':') : [];
                this.trie = addClaim(this.trie, claim);
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
