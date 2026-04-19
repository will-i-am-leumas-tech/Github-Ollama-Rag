const assert = require('assert');
const { chunkText } = require('../helpers/fileIndexer');
const { sanitizeRelativePath } = require('../helpers/utils');

const chunks = chunkText('a'.repeat(3200), 'demo.js');
assert.ok(chunks.length >= 2);
assert.strictEqual(chunks[0].path, 'demo.js');
assert.strictEqual(sanitizeRelativePath('src/index.js'), 'src/index.js');
assert.throws(() => sanitizeRelativePath('../secret.txt'));

console.log('parsing.test.js passed');
