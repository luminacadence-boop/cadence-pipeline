'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  FOLLOWUP_LADDER_DAYS,
  addDays,
  dueProspects,
  followUpAfter,
  isDue,
  todayISO,
} = require('../src/scheduler');
test('addDays crosses month and year boundaries', () => {
  assert.strictEqual(addDays('2026-01-28', 4), '2026-02-01');
  assert.strictEqual(addDays('2026-12-30', 10), '2027-01-09');
  assert.strictEqual(addDays('2026-03-01', -7), '2026-02-22');
});
test('todayISO is YYYY-MM-DD', () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(todayISO(new Date('2026-11-20T15:30:00Z')), '2026-11-20');
});
test('followUpAfter walks the 4 / 6 / 10 ladder', () => {
  assert.strictEqual(followUpAfter(1, '2026-01-01'), '2026-01-05');
  assert.strictEqual(followUpAfter(2, '2026-01-16'), '2026-01-22');
  assert.strictEqual(followUpAfter(3, '2026-01-01'), '2026-01-11');
});
test('followUpAfter returns null when the ladder is exhausted', () => {
  assert.strictEqual(followUpAfter(FOLLOWUP_LADDER_DAYS.length + 1, '2026-01-01'), null);
  assert.strictEqual(followUpAfter(0, '2026-01-01'), null);
});
test('isDue covers today, overdue, future, and unscheduled', () => {
  const active = ['new', 'contacted', 'replied', 'negotiating'];
  assert.strictEqual(isDue({ scheduledFor: '2026-11-20', stage: 'contacted' }, '2026-11-20', active), true);
  assert.strictEqual(isDue({ scheduledFor: '2026-11-13', stage: 'contacted' }, '2026-11-20', active), true);
  assert.strictEqual(isDue({ scheduledFor: '2026-11-21', stage: 'contacted' }, '2026-11-20', active), false);
  assert.strictEqual(isDue({ stage: 'contacted' }, '2026-11-20', active), false);
});
test('isDue ignores closed stages even with a stale date', () => {
  const active = ['new', 'contacted', 'replied', 'negotiating'];
  assert.strictEqual(isDue({ scheduledFor: '2026-01-01', stage: 'won' }, '2026-11-20', active), false);
  assert.strictEqual(isDue({ scheduledFor: '2026-01-01', stage: 'lost' }, '2026-11-20', active), false);
});
test('dueProspects returns the most overdue first, filtered to active', () => {
  const active = ['new', 'contacted', 'replied', 'negotiating'];
  const prospects = [
    { id: 1, name: 'Late', scheduledFor: '2026-11-15', stage: 'contacted' },
    { id: 2, name: 'Later', scheduledFor: '2026-11-10', stage: 'replied' },
    { id: 3, name: 'Closed', scheduledFor: '2026-10-01', stage: 'won' },
    { id: 4, name: 'Future', scheduledFor: '2026-12-01', stage: 'contacted' },
  ];
  const due = dueProspects(prospects, '2026-11-20', active);
  assert.deepStrictEqual(due.map(p => p.id), [2, 1]);
});
