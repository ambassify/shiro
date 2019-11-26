'use strict';

const END = Symbol('END_NODE');

function parsePermission(permission) {
    return permission.split(':').map(part => part.split(','));
}

function addClaim(trie, parts, offset = 0) {
    // reached the end of claims, anything deeper is implicitly allowed; OR
    // reached an end node in the tree, anything deeper was already allowed
    if (offset >= parts.length || trie === END)
        return END;

    trie = trie || {};

    const first = parts[offset];

    first.forEach(part => {
        trie[part] = addClaim(trie[part], parts, offset + 1);
    });

    return trie;
}

function checkPermission(trie, parts, offset = 0) {
    // we reached an end-node of trie, which implies everything deeper is allowed
    if (trie === END)
        return true;

    // reached the end of permissions request, which implies everything deeper should
    // also be allowed, but it is not since we did not reach an end-node oth the trie
    if (offset >= parts.length)
        return false;

    // trie is empty but permissions were asked for
    if (!trie)
        return false;

    const first = parts[offset];

    let len = first.length;
    while (len-- > 0) {
        const part = first[len];
        const wildcard = trie['*'];
        const exact = trie[part];

        if (!((
            (wildcard && checkPermission(wildcard, parts, offset + 1)) ||
            (exact && checkPermission(exact, parts, offset + 1))
        ) || false)) return false;
    }

    return true;
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
    // possible to not add duplicate claims in "Shiro.prototype.claims"
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

function getPossibleIntersections(permission, matrices, idx = 0) {
    let idxHasStar = false;

    do {
        idxHasStar = permission[idx] && permission[idx].includes('*');
    } while (!idxHasStar && ++idx < permission.length)

    // Reached the end without a star, return permission as is
    if (!idxHasStar)
        return [ permission ];

    // Find all non-star scope parts from the matrices at index "idx"
    const replacements = [];
    matrices.forEach(matrix => matrix.forEach(otherPermission => {
        if (!otherPermission[idx])
            return;

        otherPermission[idx].forEach(replacement => {
            if (replacement !== '*' && !replacements.includes(replacement))
                replacements.push(replacement);
        })

    }));

    return replacements.reduce((result, replacement) => {

        const replacedPermission = permission.slice();
        replacedPermission[idx] = [ replacement ];

        return result.concat(getPossibleIntersections(
            replacedPermission,
            matrices,
            idx + 1
        ));
    }, []);
}


class Shiro {

    static create(claims) {
        return new Shiro(claims);
    }

    static intersection(...permissions) {
        const matrices = [];
        const result = new Shiro();

        permissions = permissions.map(p => p instanceof Shiro ? p : Shiro.create(p));

        // First go over every scope and check if it is also part of the other
        // permission sets
        permissions.forEach((set, idx) => set.claims.forEach(permission => {
            permission = parsePermission(permission);

            if (checkPermission(result.trie, permission))
                return;

            if (permissions.every(p => checkPermission(p.trie, permission))) {
                result.trie = addClaim(result.trie, permission);
            } else {
                matrices[idx] = matrices[idx] || [];
                matrices[idx].push(permission);
            }
        }));

        // Now we only need to handle scopes that have a "*" in them to find
        // interactions between "a:*" and "*:b" for example. The result of this
        // is "a:b" but would not get added by the previous step because that
        // specific claim is not explicitly in any of the permission sets.
        matrices.forEach((matrix, matrixIdx) => {
            const otherPermissions = permissions.slice();
            otherPermissions.splice(matrixIdx, 1);

            const otherMatrices = matrices.slice();
            otherMatrices.splice(matrixIdx, 1);

            matrix.forEach(permission => {
                const possibilities = getPossibleIntersections(permission, otherMatrices);

                possibilities.forEach(possible => {
                    if (checkPermission(result.trie, possible))
                        return;

                    if (otherPermissions.every(p => checkPermission(p.trie, possible)))
                        result.trie = addClaim(result.trie, possible);
                });
            });
        });

        return result;
    }

    constructor(claims) {
        this.trie = null;
        this.cache = {};

        this.add(claims);
    }

    get claims() {
        if (!this.cache.claims) {
            const checker = new Shiro(); // eslint-disable-line no-use-before-define
            const cleanClaims = [];
            const allClaims = claimsFromTrie(this.trie);

            allClaims.forEach(c => {
                // alrready have such a claim;
                if (checker.check(c))
                    return;

                checker.add(c);
                cleanClaims.push(c);
            });

            this.cache.claims = cleanClaims;
        }

        return this.cache.claims;
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
                claim = claim ? parsePermission(claim) : [];
                this.trie = addClaim(this.trie, claim);
            });
        }

        return this;
    }

    check(permission) {
        if (!permission || typeof permission !== 'string')
            return false;

        return checkPermission(this.trie, parsePermission(permission));
    }
}

module.exports = Shiro;
