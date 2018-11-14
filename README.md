# @ambassify/shiro

Apache Shiro like permission checking in Node.JS

See https://shiro.apache.org/permissions.html

## Usage

Insall: `npm install --save @ambassify/shiro`

```js
const Shiro = require('@ambassify/shiro');

const permissions = new Shiro([ 'read:user' ]);
// const permissions = Shiro.create([ 'read:user' ]);
permissions.add('update:user');

permissions.check('delete:user'); // --> false
permissions.check('update:user'); // --> true

console.log(permissions.claims);
// --> [ 'read:user', 'update:user' ]

const otherPermissions = Shiro.create([ 'read:*' ]);
const intersection = Shiro.intersection(permissions, otherPermissions);

console.log(intersection.claims);
// --> [ 'read:user'' ]

```

## Contribute

We really appreciate any contribution you would like to make, so don't
hesitate to report issues or submit pull requests.

## License

This project is released under a MIT license.

## About us

If you would like to know more about us, be sure to have a look at [our website](https://www.ambassify.com) or our Twitter account [Ambassify](https://twitter.com/Ambassify)
