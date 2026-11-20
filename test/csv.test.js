'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCsv, rowsToProspects } = require('../src/csv');
test('parses simple comma-separated rows', () => {
  const csv = 'name,email\nDana,d@x.com\nLee,l@x.com';
  const parsed = parseCsv(csv);
  assert.deepStrictEqual(parsed.headers, ['name', 'email']);
  assert.strictEqual(parsed.rows.length, 2);
  assert.deepStrictEqual(parsed.rows[0], { name: 'Dana', email: 'd@x.com' });
  assert.deepStrictEqual(parsed.problems, []);
});
test('quoted fields may contain commas and escaped quotes', () => {
  const csv = 'name,notes\n"Frim, Jeffrey","She said ""hello, friend"""';
  const parsed = parseCsv(csv);
  assert.strictEqual(parsed.rows[0].name, 'Frim, Jeffrey');
  assert.strictEqual(parsed.rows[0].notes, 'She said "hello, friend"');
});
test('handles CRLF line endings and missing trailing newline', () => {
  const csv = 'name,email\r\nDana,d@x.com\r\nLee,l@x.com';
  const parsed = parseCsv(csv);
  assert.strictEqual(parsed.rows.length, 2);
  const noTrailing = parseCsv('name,email\nDana,d@x.com');
  assert.strictEqual(noTrailing.rows.length, 1);
});
test('rows with the wrong column count are reported, not silently accepted', () => {
  const csv = 'name,email\nDana,d@x.com,extra\nLee';
  const parsed = parseCsv(csv);
  assert.strictEqual(parsed.rows.length, 0);
  assert.strictEqual(parsed.problems.length, 2);
  assert.match(parsed.problems[0], /Row 2/);
});
test('ignores blank lines entirely', () => {
  const parsed = parseCsv('name,email\n\nDana,d@x.com\n\n');
  assert.strictEqual(parsed.rows.length, 1);
  assert.strictEqual(parsed.rows[0].name, 'Dana');
});
test('rowsToProspects maps known columns and folds extras into notes', () => {
  const records = [
    { name: 'Dana', email: 'd@x.com', company: 'Acme', their_work: 'Novel', tags: 'author', notes: 'Met in October', budget: '$500', city: 'Phoenix' },
    { email: 'lee@x.com', random: 'value' },
  ];
  const prospects = rowsToProspects(records);
  assert.strictEqual(prospects[0].name, 'Dana');
  assert.strictEqual(prospects[0].notes, 'Met in October\nbudget: $500\ncity: Phoenix');
  assert.strictEqual(prospects[1].name, undefined);
  assert.strictEqual(prospects[1].notes, 'random: value');
});
test('empty input yields empty structure, not an error', () => {
  const parsed = parseCsv('');
  assert.deepStrictEqual(parsed.rows, []);
  assert.deepStrictEqual(parsed.headers, []);
});
