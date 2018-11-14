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

function claimsFromTrie(trie, prefix = '') {
    // we reached an end-node of trie, everything deeper is implicitly "*"
    if (trie === END)
        return [ prefix + '*' ];

    // no more permissions in trie, so no claims
    if (!trie)
        return [];

    let claims = [];

    Object.keys(trie).forEach(part => {
        const claim = prefix + part;
        const partPrefix = claim + ':';

        const subClaims = claimsFromTrie(trie[part], partPrefix);

        if (subClaims.length === 1 && subClaims[0] === partPrefix + '*') {
            // this check omits trailing * from a claim so they are more compact
            claims.push(claim);
        } else {
            claims = claims.concat(subClaims);
        }
    });

    return claims;
}

function claimsFromInstance(instance) {
    if (!instance.cache.claims)
        instance.cache.claims = claimsFromTrie(instance.trie);

    return instance.cache.claims;
}

class Shiro {

    static create(claims) {
        return new Shiro(claims);
    }

    constructor(claims) {
        Object.defineProperty(this, 'trie', { value: null, writable: true });
        Object.defineProperty(this, 'cache', { value: {} });

        Object.defineProperty(this, 'claims', {
            enumerable: true,
            get: () => claimsFromInstance(this),
        });

        this.add(claims);
    }

    add(claims) {
        if (claims && typeof claims == 'string')
            claims = [ claims ];

        if (Array.isArray(claims)) {
            this.cache.claims = null;

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
