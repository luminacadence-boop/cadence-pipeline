'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  ValidationError,
  escapeHtml,
  isValidDateISO,
  isValidEmail,
  parseTags,
  validateProspect,
  validateSettings,
  validateTemplate,
} = require('../src/validate');
test('a prospect needs a name or an email', () => {
  const bad = validateProspect({});
  assert.strictEqual(bad.ok, false);
  assert.match(bad.errors.join(' '), /name or an email/);
  const good = validateProspect({ name: 'Dana' });
  assert.strictEqual(good.ok, true);
});
test('malformed email is rejected; absent email is fine', () => {
  const invalid = validateProspect({ name: 'Dana', email: 'not-an-email' });
  assert.strictEqual(invalid.ok, false);
  const absent = validateProspect({ email: '' });
  assert.strictEqual(absent.ok, false); // still needs name
  const fine = validateProspect({ name: 'Dana', email: 'dana@example.com' });
  assert.strictEqual(fine.ok, true);
});
test('all free-text fields are trimmed', () => {
  const result = validateProspect({ name: '  Dana  ', company: ' Acme ', their_work: ' Novel ', tags: ' a , B,a ' });
  assert.strictEqual(result.value.name, 'Dana');
  assert.strictEqual(result.value.company, 'Acme');
  assert.strictEqual(result.value.their_work, 'Novel');
  assert.deepStrictEqual(result.value.tags, ['a', 'B']);
});
test('parseTags dedupes case-insensitively and keeps first casing', () => {
  assert.deepStrictEqual(parseTags('author, REVIEWER, author, reviewer '), ['author', 'REVIEWER']);
  assert.deepStrictEqual(parseTags(['x', 'y']), ['x', 'y']);
});
test('isValidDateISO accepts real calendar dates only', () => {
  assert.strictEqual(isValidDateISO('2026-11-20'), true);
  assert.strictEqual(isValidDateISO('2026-02-29'), false); // not a leap year
  assert.strictEqual(isValidDateISO('2028-02-29'), true);  // leap year
  assert.strictEqual(isValidDateISO('2026-13-01'), false);
  assert.strictEqual(isValidDateISO('2026-11-2'), false);
  assert.strictEqual(isValidDateISO('hello'), false);
});
test('isValidEmail allows empty but not nonsense', () => {
  assert.strictEqual(isValidEmail(''), true);
  assert.strictEqual(isValidEmail('a@b.co'), true);
  assert.strictEqual(isValidEmail('a@b'), false);
});
test('template validation requires name, subject, and body', () => {
  const bad = validateTemplate({ name: '', subject: '', body: '  ' });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.errors.length, 3);
  const normalizes = validateTemplate({ name: 'T', subject: 'S', body: 'a\r\nb' });
  assert.strictEqual(normalizes.value.body, 'a\nb');
  assert.strictEqual(normalizes.value.serviceName, 'General');
});
test('settings validation bounds the daily target and requires your name', () => {
  assert.strictEqual(validateSettings({ senderName: '', dailyTarget: '10' }).ok, false);
  assert.strictEqual(validateSettings({ senderName: 'Jeffrey', dailyTarget: '0' }).ok, false);
  assert.strictEqual(validateSettings({ senderName: 'Jeffrey', dailyTarget: '51' }).ok, false);
  const ok = validateSettings({ senderName: 'Jeffrey', dailyTarget: '10' });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.value.dailyTarget, 10);
  assert.strictEqual(ok.value.myOffer, '');
});
test('contact email alone seeds myOffer in settings', () => {
  const result = validateSettings({ senderName: 'Jeffrey', contactEmail: 'me@lumina.com', dailyTarget: '5', myOffer: '' });
  assert.strictEqual(result.value.myOffer, 'email me at me@lumina.com');
});
test('escapeHtml neutralizes markup and injection', () => {
  assert.strictEqual(escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  assert.strictEqual(escapeHtml('plain text'), 'plain text');
  assert.strictEqual(escapeHtml(null), '');
});
test('ValidationError carries the field errors', () => {
  const err = new ValidationError(['One', 'Two']);
  assert.strictEqual(err.name, 'ValidationError');
  assert.deepStrictEqual(err.errors, ['One', 'Two']);
});
