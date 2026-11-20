'use strict';
const db = require('../db');
const { errorList, inputRow, layout, submit } = require('./layout');
function renderSettings(values = {}, errors = [], saved) {
  const s = values.senderName !== undefined ? values : db.getSettings();
  const body =
    '<h1>Settings</h1>' +
    (saved ? '<div class="flash flash-success">Settings saved.</div>' : '') +
    errorList(errors) +
    '<form method="post" action="/settings" class="stack">' +
    inputRow('Your name ({{sender_name}})', 'senderName', s.senderName, { placeholder: 'Jeffrey Fritzsche' }) +
    inputRow('Your contact email', 'contactEmail', s.contactEmail, { type: 'email' }) +
    inputRow('Your one-line offer ({{my_offer}})', 'myOffer', s.myOffer, { placeholder: 'E.g. manuscript cleanup through upload-ready formatting for independent authors' }) +
    '<label class="field"><span>Daily outreach target (messages sent, 1-50)</span>' +
    '<input type="number" name="dailyTarget" min="1" max="50" value="' + (s.dailyTarget || 10) + '"></label>' +
    '<div class="form-actions">' + submit('Save settings') + '</div>' +
    '</form>' +
    '<div class="card"><p class="hint">Privacy: everything here is stored in a local file on this machine. No account, no cloud, no telemetry. Back up by copying the data file.</p></div>';
  return layout('Settings', body, { path: '/settings' });
}
module.exports = { renderSettings };
