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

    const trieRootKeys = Object.keys(trie);

    // make sure * claims are first in the returned claims array, this makes it
    // possible to not add duplicate claims in "claimsFromInstance"
    if (trie['*']) {
        trieRootKeys.splice(trieRootKeys.indexOf('*'), 1);
        trieRootKeys.unshift('*');
    }

    trieRootKeys.forEach(part => {
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
    if (!instance.cache.claims) {
        const checker = new Shiro(); // eslint-disable-line no-use-before-define
        const cleanClaims = [];
        const allClaims = claimsFromTrie(instance.trie);

        allClaims.forEach(c => {
            // alrready have such a claim;
            if (checker.check(c))
                return;

            checker.add(c);
            cleanClaims.push(c);
        });

        instance.cache.claims = cleanClaims;
    }

    return instance.cache.claims;
}

function addTrieToMatrix(matrix, trie, currentLevel = 0) {
    if (!trie)
        return;

    matrix[currentLevel] = matrix[currentLevel] || { star: false, other: [] };

    // Reached an end node, so this level of the matrix includes a star permission
    if (trie === END) {
        matrix[currentLevel].star = true;
        return;
    }

    Object.keys(trie).forEach(claimPart => {
        if (claimPart === '*')
            matrix[currentLevel].star = true;
        else if (!matrix[currentLevel].other.includes(claimPart))
            matrix[currentLevel].other.push(claimPart);

        addTrieToMatrix(matrix, trie[claimPart], currentLevel + 1);
    });
}

function analyzeMatrix(matrix, ownedPermissions, intersection) {
    if (!matrix.length)
        return [];

    function analyzeRow(rowIdx, prefix = '') {
        if (!matrix[rowIdx])
            return;

        const { star, other } = matrix[rowIdx];

        if (star) {
            const starScope = prefix + '*';
            const inIntersection = intersection.check(starScope);
            const owned = inIntersection || ownedPermissions.every(p => p.check(starScope));

            if (owned && !inIntersection)
                intersection.add(starScope);

            // start scope at this level is owned, stop analyzing because
            // everything that's nested deeper is implicitly owned
            if (owned)
                return;
        }

        // add * at the start of array  because it might implicitly grant the
        // scopes in "other"
        const parts = star ? [ '*' ].concat(other) : other;

        parts.forEach(part => {
            const currentScope = prefix + part;

            // already in intersection, no use in checking any further
            if (intersection.check(currentScope))
                return;

            if (ownedPermissions.every(p => p.check(currentScope)))
                intersection.add(currentScope);
            else
                analyzeRow(rowIdx + 1, currentScope + ':');
        });
    }

    analyzeRow(0);
}

class Shiro {

    static create(claims) {
        return new Shiro(claims);
    }

    static intersection(...permissions) {
        const matrix = [];
        const result = new Shiro();

        permissions = permissions.map(p => p instanceof Shiro ? p : Shiro.create(p));
        permissions.forEach(p => addTrieToMatrix(matrix, p.trie));
        analyzeMatrix(matrix, permissions, result);

        return result;
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
