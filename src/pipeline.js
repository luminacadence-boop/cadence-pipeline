'use strict';
/**
 * Pipeline stages and transition rules.
 *
 * Discipline rules encoded here:
 *  - You cannot mark a prospect "contacted" unless an outbound message has
 *    been logged. Stage changes follow evidence, not intentions.
 *  - Won and Lost are terminal except for a deliberate "revive" from Lost
 *    back to Contacted.
 */
const STAGES = ['new', 'contacted', 'replied', 'negotiating', 'won', 'lost'];
const ACTIVE_STAGES = ['new', 'contacted', 'replied', 'negotiating'];
const TRANSITIONS = {
  new: ['contacted', 'lost'],
  contacted: ['replied', 'lost'],
  replied: ['negotiating', 'lost'],
  negotiating: ['won', 'replied', 'lost'],
  won: [],
  lost: ['contacted'],
};
const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
};
class PipelineError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PipelineError';
  }
}
function isKnownStage(stage) {
  return STAGES.includes(stage);
}
function isStageActive(stage) {
  return ACTIVE_STAGES.includes(stage);
}
/** Allowed next stages for a prospect. */
function nextStages(from) {
  return (TRANSITIONS[from] || []).slice();
}
function canTransition(from, to, hasOutbound) {
  if (!isKnownStage(from) || !isKnownStage(to)) return false;
  if (!nextStages(from).includes(to)) return false;
  if (to === 'contacted' && !hasOutbound) return false;
  return true;
}
function assertTransition(prospect, to, hasOutbound) {
  if (!prospect || !isKnownStage(prospect.stage)) {
    throw new PipelineError('Unknown or missing prospect stage.');
  }
  if (!isKnownStage(to)) {
    throw new PipelineError('Unknown stage "' + to + '".');
  }
  if (!nextStages(prospect.stage).includes(to)) {
    throw new PipelineError(
      'Cannot move from "' + STAGE_LABELS[prospect.stage] + '" to "' + STAGE_LABELS[to] + '".' +
      (prospect.stage === 'won' ? ' This work is already closed out as Won.' : '')
    );
  }
  if (to === 'contacted' && !hasOutbound) {
    throw new PipelineError('Log one outbound message first. "Contacted" requires evidence of a send.');
  }
}
module.exports = {
  ACTIVE_STAGES,
  PipelineError,
  STAGES,
  STAGE_LABELS,
  TRANSITIONS,
  assertTransition,
  canTransition,
  isKnownStage,
  isStageActive,
  nextStages,
};
