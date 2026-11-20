'use strict';
const db = require('../db');
const scheduler = require('../scheduler');
const pipeline = require('../pipeline');
const { escapeHtml } = require('../validate');
const { layout, stageBadge, flash } = require('./layout');
function statCard(label, value, hint = '') {
  return '<div class="card stat"><div class="stat-value">' + escapeHtml(value) + '</div>' +
    '<div class="stat-label">' + escapeHtml(label) + '</div>' +
    (hint ? '<div class="stat-hint">' + escapeHtml(hint) + '</div>' : '') + '</div>';
}
/**
 * The dashboard is the daily launch point: everything you owe today, all the
 * evidence of what you have done, and one obvious next action.
 */
function renderDashboard(today, flashMessage) {
  const settings = db.getSettings();
  const prospects = db.listProspects();
  const activities = db.allActivities();
  const due = scheduler.dueProspects(prospects, today, pipeline.ACTIVE_STAGES);
  const readyToContact = prospects.filter(p => p.stage === 'new');
  const sentToday = activities.filter(a => a.type === 'outbound' && a.date === today).length;
  const sent7 = activities.filter(a => a.type === 'outbound' && a.date >= scheduler.addDays(today, -6)).length;
  const totalSent = activities.filter(a => a.type === 'outbound').length;
  const replies = activities.filter(a => a.type === 'reply').length;
  const replyRate = totalSent > 0 ? Math.round((replies / totalSent) * 100) : null;
  const wins = prospects.filter(p => p.stage === 'won').length;
  const activeCount = prospects.filter(p => pipeline.isStageActive(p.stage)).length;
  const remaining = Math.max(0, (settings.dailyTarget || 10) - sentToday);
  const dueList = due.length
    ? '<ul class="action-list">' + due.map(p =>
        '<li>' + stageBadge(p.stage) + ' <a href="/prospects/' + p.id + '">' + escapeHtml(p.name || p.email) + '</a>' +
        '<span class="due-date">due ' + escapeHtml(p.scheduledFor) + '</span></li>'
      ).join('') + '</ul>'
    : '<p class="empty">Nothing due. Either contact fresh prospects below, or enjoy a guilt-free pause: the system, not willpower, did its job.</p>';
  const readyList = readyToContact.length
    ? '<ul class="action-list">' + readyToContact.slice(0, 8).map(p =>
        '<li><a href="/prospects/' + p.id + '">' + escapeHtml(p.name || p.email) + '</a>' +
        (p.tags && p.tags.length ? ' <span class="tag">' + p.tags.map(t => escapeHtml(t)).join('</span> <span class="tag">') + '</span>' : '') + '</li>'
      ).join('') + '</ul>' +
      (readyToContact.length > 8 ? '<p class="hint">' + (readyToContact.length - 8) + ' more on the Prospects page.</p>' : '')
    : '<p class="empty">No fresh prospects. Researching and adding people <em>is</em> a legitimate outreach action; add a few <a href="/prospects/new">here</a>.</p>';
  const body =
    flash(flashMessage) +
    (settings.senderName ? '' : '<div class="flash flash-warning">First run? <a href="/settings">Add your name and daily target in Settings</a> so templates fill correctly.</div>') +
    '<section class="stats-row">' +
      statCard('Outreach sent today', String(sentToday), 'target ' + (settings.dailyTarget || 10) + '/day') +
      statCard('Sent, last 7 days', String(sent7)) +
      statCard('Reply rate', replyRate === null ? '—' : replyRate + '%', replies + ' replies / ' + totalSent + ' sent') +
      statCard('Active pipeline', String(activeCount), wins + ' won') +
    '</section>' +
    '<section class="two-col">' +
      '<div class="card"><h2>Follow-ups due today (' + due.length + ')</h2>' + dueList + '</div>' +
      '<div class="card"><h2>Ready for first contact (' + readyToContact.length + ')</h2>' + readyList + '</div>' +
    '</section>' +
    '<section class="row-actions">' +
      '<a class="btn btn-primary" href="/prospects/new">Add prospect</a>' +
      '<a class="btn" href="/prospects/import">Import CSV</a>' +
      '<span class="target-note">' + (remaining === 0
        ? 'Daily outreach target met. That is the win for today.'
        : 'Daily target: ' + remaining + ' more outbound message' + (remaining === 1 ? '' : 's') + '. One sent message still counts.') + '</span>' +
    '</section>';
  return layout('Dashboard', body, { path: '/' });
}
module.exports = { renderDashboard };
