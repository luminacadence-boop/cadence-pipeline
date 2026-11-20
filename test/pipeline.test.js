'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  ACTIVE_STAGES,
  PipelineError,
  STAGES,
  assertTransition,
  canTransition,
  nextStages,
} = require('../src/pipeline');
test('happy-path progression is allowed', () => {
  assert.strictEqual(canTransition('new', 'contacted', true), true);
  assert.strictEqual(canTransition('contacted', 'replied', false), true);
  assert.strictEqual(canTransition('replied', 'negotiating', false), true);
  assert.strictEqual(canTransition('negotiating', 'won', false), true);
});
test('contacted requires evidence: an outbound message', () => {
  assert.strictEqual(canTransition('new', 'contacted', false), false);
  assert.throws(() => assertTransition({ stage: 'new' }, 'contacted', false), PipelineError);
  assert.doesNotThrow(() => assertTransition({ stage: 'new' }, 'contacted', true));
});
test('skipping stages is blocked', () => {
  assert.strictEqual(canTransition('new', 'won', true), false);
  assert.strictEqual(canTransition('new', 'replied', true), false);
  assert.strictEqual(canTransition('contacted', 'won', false), false);
});
test('won and lost are terminal except reviving lost prospects', () => {
  assert.deepStrictEqual(nextStages('won'), []);
  assert.deepStrictEqual(nextStages('lost'), ['contacted']);
  assert.throws(() => assertTransition({ stage: 'won' }, 'contacted', true), PipelineError);
});
test('lost can be revived deliberately', () => {
  assert.doesNotThrow(() => assertTransition({ stage: 'lost' }, 'contacted', true));
});
test('unknown stages are rejected everywhere', () => {
  assert.strictEqual(canTransition('new', 'closed', true), false);
  assert.strictEqual(canTransition('maybe', 'won', true), false);
  assert.throws(() => assertTransition({ stage: 'weird' }, 'new', true), PipelineError);
  assert.throws(() => assertTransition({ stage: 'new' }, 'weird', true), PipelineError);
});
test('active stages exclude won and lost', () => {
  assert.deepStrictEqual(ACTIVE_STAGES.length, 4);
  assert.strictEqual(ACTIVE_STAGES.includes('won'), false);
  assert.strictEqual(ACTIVE_STAGES.includes('lost'), false);
  assert.strictEqual(STAGES.length, 6);
});
