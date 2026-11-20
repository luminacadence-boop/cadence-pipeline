'use strict';
const { escapeHtml } = require('../validate');
const { STAGE_LABELS } = require('../pipeline');
const NAV = [
  ['/', 'Dashboard'],
  ['/prospects', 'Prospects'],
  ['/templates', 'Templates'],
  ['/settings', 'Settings'],
];
function layout(title, body, opts = {}) {
  const nav = NAV.map(([href, label]) => {
    const current = href === '/' ? opts.path === '/' : opts.path && opts.path.startsWith(href);
    return '<a href="' + href + '"' + (current ? ' class="active"' : '') + '>' + label + '</a>';
  }).join('');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + escapeHtml(title) + ' · Cadence Pipeline</title>\n' +
    '<link rel="stylesheet" href="/public/styles.css">\n</head>\n<body>\n' +
    '<header class="topbar"><a class="brand" href="/">Cadence Pipeline</a><nav>' + nav + '</nav></header>\n' +
    '<main>' + body + '</main>\n' +
    '<footer>Cadence Pipeline · your data stays on this machine</footer>\n' +
    '<script src="/public/app.js"></script>\n</body>\n</html>';
}
function stageBadge(stage) {
  return '<span class="badge stage-' + escapeHtml(stage) + '">' + escapeHtml(STAGE_LABELS[stage] || stage) + '</span>';
}
function flash(message, kind = 'info') {
  if (!message) return '';
  return '<div class="flash flash-' + kind + '">' + escapeHtml(message) + '</div>';
}
function errorList(errors) {
  if (!errors || errors.length === 0) return '';
  return '<div class="flash flash-error"><strong>Please fix:</strong><ul>' +
    errors.map(e => '<li>' + escapeHtml(e) + '</li>').join('') + '</ul></div>';
}
function inputRow(label, name, value = '', opts = {}) {
  const type = opts.type || 'text';
  const required = opts.required ? ' required' : '';
  const placeholder = opts.placeholder ? ' placeholder="' + escapeHtml(opts.placeholder) + '"' : '';
  return '<label class="field"><span>' + escapeHtml(label) + '</span>' +
    '<input type="' + type + '" name="' + name + '" value="' + escapeHtml(value) + '"' + placeholder + required + '></label>';
}
function textareaRow(label, name, value = '', rows = 4, opts = {}) {
  const placeholder = opts.placeholder ? ' placeholder="' + escapeHtml(opts.placeholder) + '"' : '';
  return '<label class="field"><span>' + escapeHtml(label) + '</span>' +
    '<textarea name="' + name + '" rows="' + rows + '"' + placeholder + '>' + escapeHtml(value) + '</textarea></label>';
}
function submit(label, opts = {}) {
  const cls = opts.variant ? ' class="btn btn-' + opts.variant + '"' : ' class="btn btn-primary"';
  return '<button type="submit"' + cls + '>' + escapeHtml(label) + '</button>';
}
function confirmForm(action, hiddenFields, buttonLabel, confirmText, variant = 'danger') {
  const hiddens = Object.entries(hiddenFields)
    .map(([k, v]) => '<input type="hidden" name="' + k + '" value="' + escapeHtml(v) + '">')
    .join('');
  return '<form method="post" action="' + action + '" data-confirm="' + escapeHtml(confirmText) + '" class="inline-form">' +
    hiddens + '<button type="submit" class="btn btn-' + variant + '">' + escapeHtml(buttonLabel) + '</button></form>';
}
module.exports = { confirmForm, errorList, flash, inputRow, layout, stageBadge, submit, textareaRow };
