'use strict';
const db = require('../db');
const pipeline = require('../pipeline');
const templates = require('../templates');
const { escapeHtml, isValidDateISO } = require('../validate');
const { confirmForm, errorList, flash, inputRow, layout, stageBadge, submit, textareaRow } = require('./layout');
function prospectTable(prospects, stageFilter) {
  const rows = prospects.map(p =>
    '<tr>' +
    '<td><a href="/prospects/' + p.id + '">' + escapeHtml(p.name || '(no name)') + '</a></td>' +
    '<td>' + escapeHtml(p.email || '') + '</td>' +
    '<td>' + escapeHtml(p.company || '') + '</td>' +
    '<td>' + stageBadge(p.stage) + '</td>' +
    '<td>' + (p.scheduledFor && pipeline.isStageActive(p.stage) ? escapeHtml(p.scheduledFor) : '—') + '</td>' +
    '<td>' + (p.tags || []).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join(' ') + '</td>' +
    '</tr>'
  ).join('');
  const stageOptions = ['all'].concat(pipeline.STAGES).map(s => {
    const selected = stageFilter === s ? ' selected' : '';
    const label = s === 'all' ? 'All stages' : pipeline.STAGE_LABELS[s];
    return '<option value="' + s + '"' + selected + '>' + label + '</option>';
  }).join('');
  return '<form method="get" action="/prospects" class="filter-form">' +
      '<label>Filter by stage <select name="stage">' + stageOptions + '</select></label> ' +
      '<button type="submit" class="btn btn-soft">Filter</button>' +
    '</form>' +
    (prospects.length === 0
      ? '<p class="empty">No prospects here yet. <a href="/prospects/new">Add one</a> or <a href="/prospects/import">import a CSV</a>.</p>'
      : '<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Stage</th><th>Follow-up</th><th>Tags</th></tr></thead><tbody>' + rows + '</tbody></table>');
}
function renderProspectList(prospects, stageFilter) {
  const body =
    '<div class="page-head"><h1>Prospects</h1>' +
    '<div><a class="btn btn-primary" href="/prospects/new">Add prospect</a> ' +
    '<a class="btn" href="/prospects/import">Import CSV</a></div></div>' +
    prospectTable(prospects, stageFilter);
  return layout('Prospects', body, { path: '/prospects' });
}
function renderProspectForm(values = {}, errors = []) {
  const v = key => values[key] || '';
  const body =
    '<h1>Add prospect</h1>' +
    errorList(errors) +
    '<form method="post" action="/prospects" class="stack">' +
    inputRow('Name', 'name', v('name'), { placeholder: 'Their name' }) +
    inputRow('Email', 'email', v('email'), { type: 'email' }) +
    inputRow('Company or website', 'company', v('company'), { placeholder: 'Optional' }) +
    inputRow('Their work', 'their_work', v('their_work'), { placeholder: 'Book title, site, product... fills {{their_work}} in templates' }) +
    inputRow('Tags', 'tags', v('tags'), { placeholder: 'author, needs-editing, reviewer' }) +
    textareaRow('Notes', 'notes', v('notes'), 4, { placeholder: 'Anything you noticed worth referencing later' }) +
    '<div class="form-actions">' + submit('Save prospect') + ' <a class="btn btn-ghost" href="/prospects">Cancel</a></div>' +
    '</form>';
  return layout('Add prospect', body, { path: '/prospects' });
}
const STAGE_BUTTON_CLASS = {
  contacted: 'btn-primary',
  replied: 'btn-soft',
  negotiating: 'btn-soft',
  won: 'btn-success',
  lost: 'btn-ghost',
};
function renderProspectDetail(prospect, opts = {}) {
  const settings = db.getSettings();
  const history = db.activitiesFor(prospect.id);
  const picks = db.listTemplates();
  const nextStages = pipeline.nextStages(prospect.stage);
  const outboundForPreview = db.countOutbound(prospect.id);
  // Composer: template picker via GET (?templateId=), then send-ready text.
  let composer = '';
  let warning = '';
  if (!pipeline.isStageActive(prospect.stage)) {
    composer = '<p class="empty">This prospect is ' + pipeline.STAGE_LABELS[prospect.stage] + '. Revive them from Lost, or the history here stays closed.</p>';
  } else {
    const templateId = opts.templateId && db.getTemplate(opts.templateId) ? Number(opts.templateId) : (picks[0] ? picks[0].id : null);
    const template = templateId ? db.getTemplate(templateId) : null;
    let subject = opts.draftSubject !== undefined ? opts.draftSubject : '';
    let body = opts.draftBody !== undefined ? opts.draftBody : '';
    if (template && subject === '' && body === '') {
      const rendered = templates.renderForProspect(prospect, template, settings);
      subject = rendered.subject;
      body = rendered.body;
      if (rendered.missing.length) {
        warning = 'Missing data: ' + rendered.missing.map(m => '<code>' + escapeHtml(m) + '</code>').join(', ') +
          '. Fill them in Settings or replace the bracketed slots by hand before sending.';
      }
    }
    const options = picks.map(t =>
      '<option value="' + t.id + '"' + (template && t.id === template.id ? ' selected' : '') + '>' + escapeHtml(t.name) + '</option>'
    ).join('');
    composer =
      '<div class="card"><h2>Compose outreach</h2>' +
      (opts.composerFlash || '') +
      (warning ? '<div class="flash flash-warning">' + warning + '</div>' : '') +
      '<form method="get" action="/prospects/' + prospect.id + '" class="filter-form">' +
      '<input type="hidden" name="compose" value="1">' +
      '<label>Template <select name="templateId" data-autosubmit>' + options + '</select></label>' +
      '</form>' +
      '<form method="post" action="/prospects/' + prospect.id + '/log-message" class="stack">' +
      inputRow('Subject', 'subject', subject, { required: true }) +
      '<label class="field copy-when-filled"><span>Message (edit the bracketed slots: copy happens after you save)</span>' +
      '<textarea name="body" rows="12">' + escapeHtml(body) + '</textarea></label>' +
      inputRow('Sent on', 'date', opts.today, { type: 'date' }) +
      '<div class="form-actions">' + submit('Log as sent + schedule follow-up') +
      '<button type="button" class="btn btn-soft btn-copy-draft">Copy subject + body</button>' +
      '<span class="hint">Copy, send from your own inbox, then log it here.</span></div>' +
      '</form></div>';
  }
  const stageButtons = nextStages.map(to =>
    confirmForm(
      '/prospects/' + prospect.id + '/stage',
      { stage: to },
      pipeline.STAGE_LABELS[to],
      to === 'won' ? 'Mark as Won? Congratulations in advance.' : 'Move to ' + pipeline.STAGE_LABELS[to] + '?',
      STAGE_BUTTON_CLASS[to] || ''
    )
  ).join(' ');
  const historyList = history.length
    ? '<ul class="history">' + history.map(a => {
        const kindLabel = { outbound: 'Sent', reply: 'Reply received', note: 'Note', stage: 'Stage change' }[a.type] || a.type;
        let detail = '';
        if (a.type === 'outbound') detail = '<strong>' + escapeHtml(a.subject || '') + '</strong><pre>' + escapeHtml(a.body || '') + '</pre>';
        else if (a.note) detail = escapeHtml(a.note);
        else if (a.detail) detail = escapeHtml(a.detail);
        return '<li data-copyable><span class="kind kind-' + escapeHtml(a.type) + '">' + kindLabel + '</span> <span class="date">' + escapeHtml(a.date || '') + '</span>' +
          (detail ? '<div class="detail">' + detail + '</div>' : '') +
          (a.type === 'outbound' ? '<button type="button" class="btn btn-soft btn-copy" data-copy="' + escapeHtml((a.subject || '') + '\n\n' + (a.body || '')) + '">Copy again</button>' : '') +
          '</li>';
      }).join('') + '</ul>'
    : '<p class="empty">No activity yet. The first sent message starts this relationship\'s clock.</p>';
  const scheduleForm = pipeline.isStageActive(prospect.stage)
    ? '<form method="post" action="/prospects/' + prospect.id + '/schedule" class="inline-form">' +
      inputRow('Next follow-up on', 'date', prospect.scheduledFor || opts.today, { type: 'date' }) +
      submit('Schedule', { variant: 'soft' }) + '</form>'
    : '';
  const noteForm = pipeline.isStageActive(prospect.stage)
    ? '<form method="post" action="/prospects/' + prospect.id + '/note" class="stack">' +
      textareaRow('Add note (something to reference in a future message)', 'note', '', 3) +
      submit('Save note', { variant: 'soft' }) + '</form>'
    : '';
  const body =
    errorList(opts.errors) + flash(opts.message) +
    '<div class="page-head"><h1>' + escapeHtml(prospect.name || '(no name)') + '</h1>' + stageBadge(prospect.stage) + '</div>' +
    '<div class="detail-grid">' +
      '<div>Contact: ' + (prospect.email ? escapeHtml(prospect.email) : '<em>no email recorded</em>') + '</div>' +
      '<div>Company: ' + (prospect.company ? escapeHtml(prospect.company) : '—') + '</div>' +
      '<div>Their work: ' + (prospect.their_work ? escapeHtml(prospect.their_work) : '—') + '</div>' +
      '<div>Outbound sent: ' + outboundForPreview + '</div>' +
      '<div>Tags: ' + (prospect.tags && prospect.tags.length ? prospect.tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join(' ') : '—') + '</div>' +
    '</div>' +
    (prospect.notes ? '<p class="notes">' + escapeHtml(prospect.notes).replace(/\n/g, '<br>') + '</p>' : '') +
    '<div class="card"><h2>Stage: ' + pipeline.STAGE_LABELS[prospect.stage] + '</h2>' +
      '<p class="hint">' + (pipeline.isStageActive(prospect.stage)
        ? 'Move only when there is evidence. Meaning shows in the history, not the label.'
        : 'Closed stages keep their history for future reference.') + '</p>' +
      '<div class="stage-actions">' + (stageButtons || '<span class="hint">No further moves from here.</span>') + '</div>' +
    '</div>' +
    composer +
    '<div class="card"><h2>Follow-up</h2>' + scheduleForm + noteForm + '</div>' +
    '<div class="card"><h2>History (' + history.length + ')</h2>' +
      '<form method="post" action="/prospects/' + prospect.id + '/log-reply" class="inline-form">' +
      inputRow('Reply received on', 'date', opts.today, { type: 'date' }) +
      submit('They replied! Log it', { variant: 'success' }) + '</form>' +
      historyList +
    '</div>' +
    '<div class="danger-zone">' + confirmForm('/prospects/' + prospect.id + '/delete', {}, 'Delete prospect permanently', 'Delete this prospect and all of their history? This cannot be undone.') + '</div>';
  return layout('Prospect', body, { path: '/prospects' });
}
function renderImportForm(records, problems, imported) {
  let preview = '';
  if (problems && problems.length) {
    preview = errorList(problems);
  }
  if (records && records.length) {
    preview += '<p>Detected ' + records.length + ' row(s). Column names expected: <code>name, email, company, their_work, tags, notes</code>. Extra columns become notes lines.</p>';
  }
  const body =
    flash(imported === true ? null : '') +
    '<h1>Import prospects from CSV</h1>' +
    '<p>Export from a spreadsheet, paste the text below (including the header row), and preview.</p>' +
    preview +
    '<form method="post" action="/prospects/import" class="stack">' +
    textareaRow('CSV text', 'csv', '', 12) +
    '<div class="form-actions">' + submit('Import') + '</div>' +
    '</form>';
  return layout('Import CSV', body, { path: '/prospects' });
}
module.exports = { renderImportForm, renderProspectDetail, renderProspectForm, renderProspectList };
