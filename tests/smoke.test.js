const assert = require('assert');
const { normalizeRepoInput } = require('../helpers/utils');

assert.deepStrictEqual(normalizeRepoInput('facebook/react'), {
  owner: 'facebook',
  repo: 'react'
});

assert.deepStrictEqual(normalizeRepoInput('https://github.com/vercel/next.js'), {
  owner: 'vercel',
  repo: 'next.js'
});

assert.strictEqual(normalizeRepoInput(''), null);
assert.strictEqual(normalizeRepoInput('not valid path here'), null);

console.log('smoke.test.js passed');
