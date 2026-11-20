'use strict';
/**
 * Follow-up scheduling. The ladder below encodes a proven freelance rhythm:
 * touch on day 0, follow up after 4 days, then 6, then 10. After the ladder
 * runs out, the prospect is left without a scheduled date so you can decide
 * (keep in touch later, or close the loop with the "break-up" template).
 */
const FOLLOWUP_LADDER_DAYS = [4, 6, 10];
/** Adds n days to a YYYY-MM-DD date, staying in UTC. */
function addDays(dateISO, n) {
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
/** True when a follow-up belongs on today's list (today or overdue). */
function isDue(prospect, today, activeStages) {
  if (!prospect || !prospect.scheduledFor) return false;
  if (Array.isArray(activeStages) && !activeStages.includes(prospect.stage)) return false;
  return prospect.scheduledFor <= today;
}
/**
 * Next scheduled follow-up after the outboundCount-th message on dateISO.
 * Returns null once the ladder is exhausted.
 */
function followUpAfter(outboundCount, dateISO, ladder = FOLLOWUP_LADDER_DAYS) {
  if (!Number.isInteger(outboundCount) || outboundCount < 1) return null;
  const index = outboundCount - 1;
  if (index >= ladder.length) return null;
  return addDays(dateISO, ladder[index]);
}
/** Prospects whose scheduled date has arrived, most overdue first. */
function dueProspects(prospects, today, activeStages) {
  return (prospects || [])
    .filter(p => isDue(p, today, activeStages))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}
module.exports = {
  FOLLOWUP_LADDER_DAYS,
  addDays,
  dueProspects,
  followUpAfter,
  isDue,
  todayISO,
};
