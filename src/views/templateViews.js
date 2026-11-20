'use strict';
const { escapeHtml } = require('../validate');
const { errorList, inputRow, layout, submit, textareaRow, confirmForm } = require('./layout');
const { tokensIn } = require('../templates');
const DOCUMENTED_TOKENS = [
  ['{{name}}', "Prospect's name"],
  ['{{email}}', "Prospect's email"],
  ['{{company}}', 'Company or website'],
  ['{{their_work}}', 'Their book, site, or product'],
  ['{{sender_name}}', 'Your name (Settings)'],
  ['{{contact_email}}', 'Your email (Settings)'],
  ['{{my_offer}}', 'Your one-line offer (Settings)'],
];
const AVAILABLE = ['name', 'email', 'company', 'their_work', 'sender_name', 'contact_email', 'my_offer'];
function templateCard(t) {
  const tokens = tokensIn(t.subject).concat(tokensIn(t.body)).filter((v, i, a) => a.indexOf(v) === i);
  const unknown = tokens.filter(tok => !AVAILABLE.includes(tok));
  return '<div class="card template-card"><h2>' + escapeHtml(t.name) + '</h2>' +
    '<p class="hint">Subject: ' + escapeHtml(t.subject) + '</p>' +
    '<pre class="snippet">' + escapeHtml(t.body) + '</pre>' +
    (unknown.length ? '<div class="flash flash-warning">Uses tokens not supplied automatically: ' +
      unknown.map(u => '<code>' + escapeHtml('{{' + u + '}}') + '</code>').join(', ') + ' (fine if you fill them by hand).</div>' : '') +
    '<div class="form-actions"><a class="btn btn-soft" href="/templates/' + t.id + '">Edit</a> ' +
    confirmForm('/templates/' + t.id + '/delete', {}, 'Delete', 'Delete template "' + t.name + '"?', 'danger') + '</div></div>';
}
function renderTemplateList(list) {
  const body =
    '<div class="page-head"><h1>Message templates</h1><a class="btn btn-primary" href="/templates/new">New template</a></div>' +
    '<div class="token-help"><strong>How tokens work:</strong> data tokens below are filled automatically from the prospect and your Settings. Empty values appear as <code>[token]</code> in the draft so you cannot miss them. Square-bracket slots like <code>[name the page you noticed]</code> are personalization prompts, meant to be edited by hand.</div>' +
    '<table class="token-table"><thead><tr><th>Token</th><th>Fills from</th></tr></thead><tbody>' +
    DOCUMENTED_TOKENS.map(rows => '<tr><td><code>' + escapeHtml(rows[0]) + '</code></td><td>' + escapeHtml(rows[1]) + '</td></tr>').join('') +
    '</tbody></table>' +
    (list.length === 0 ? '<p class="empty">No templates. Create one to start.</p>' : list.map(templateCard).join(''));
  return layout('Templates', body, { path: '/templates' });
}
function renderTemplateForm(values = {}, errors = [], id = null) {
  const v = key => values[key] || '';
  const action = id ? '/templates/' + id : '/templates';
  const heading = id ? 'Edit template' : 'New template';
  const body =
    '<h1>' + heading + '</h1>' +
    errorList(errors) +
    '<form method="post" action="' + action + '" class="stack">' +
    inputRow('Name', 'name', v('name'), { required: true }) +
    inputRow('Service line (optional label, e.g. "Editing services")', 'serviceName', v('serviceName')) +
    inputRow('Subject', 'subject', v('subject'), { required: true }) +
    textareaRow('Body (tokens like {{name}} welcome)', 'body', v('body'), 14) +
    '<div class="form-actions">' + submit('Save template') + ' <a class="btn btn-ghost" href="/templates">Cancel</a></div>' +
    '</form>';
  return layout(heading, body, { path: '/templates' });
}
module.exports = { renderTemplateForm, renderTemplateList };
