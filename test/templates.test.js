'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { renderForProspect, renderTemplate, tokensIn, varsForProspect } = require('../src/templates');
test('renderTemplate fills known tokens', () => {
  const result = renderTemplate('Hi {{name}}, re: {{their_work}}', { name: 'Dana', their_work: 'The Long Draft' });
  assert.strictEqual(result.text, 'Hi Dana, re: The Long Draft');
  assert.deepStrictEqual(result.missing, []);
});
test('renderTemplate flags missing tokens and marks them visibly', () => {
  const result = renderTemplate('Hi {{name}}, re: {{their_work}}', { name: 'Dana' });
  assert.strictEqual(result.text, 'Hi Dana, re: [their_work]');
  assert.deepStrictEqual(result.missing.sort(), ['their_work']);
});
test('renderTemplate tolerates whitespace inside braces', () => {
  const result = renderTemplate('Hi {{  name  }}', { name: 'Dana' });
  assert.strictEqual(result.text, 'Hi Dana');
});
test('empty-string values count as missing, not silent blanks', () => {
  const result = renderTemplate('From {{sender_name}}', { sender_name: '  ' });
  assert.strictEqual(result.text, 'From [sender_name]');
  assert.deepStrictEqual(result.missing, ['sender_name']);
});
test('tokensIn returns unique token names', () => {
  assert.deepStrictEqual(tokensIn('{{a}} {{b}} {{a}}'), ['a', 'b']);
});
test('varsForProspect maps prospect and settings fields', () => {
  const vars = varsForProspect({ name: 'Sam', email: 's@x.com', company: 'Acme', their_work: 'Novel' }, { senderName: 'Jeffrey' });
  assert.strictEqual(vars.name, 'Sam');
  assert.strictEqual(vars.sender_name, 'Jeffrey');
  assert.strictEqual(vars.my_offer, undefined);
});
test('renderForProspect merges subject and body missing tokens', () => {
  const prospect = { name: 'Kim', their_work: 'Essays' };
  const template = { subject: 'Re: {{their_work}}', body: 'Hi {{name}}, from {{sender_name}} via {{company}}' };
  const settings = { senderName: 'Jeffrey', contactEmail: '', myOffer: '' };
  const result = renderForProspect(prospect, template, settings);
  assert.strictEqual(result.subject, 'Re: Essays');
  assert.strictEqual(result.body.includes('Hi Kim,'), true);
  assert.deepStrictEqual(result.missing, ['company']);
});
