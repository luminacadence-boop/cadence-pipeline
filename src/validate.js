'use strict';
/**
 * Validation and escaping helpers. Every request body passes through
 * these functions before it touches the database.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
class ValidationError extends Error {
  constructor(errors) {
    super(errors.join(' '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function isValidEmail(value) {
  const v = str(value);
  return v === '' || EMAIL_RE.test(v);
}
/** Accepts a strict YYYY-MM-DD calendar date. */
function isValidDateISO(value) {
  const v = str(value);
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
/** Comma-separated tags into a unique, trimmed array. */
function parseTags(value) {
  const raw = Array.isArray(value) ? value.join(',') : str(value);
  const seen = new Set();
  const tags = [];
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return tags;
}
function validateProspect(input) {
  const errors = [];
  const value = {
    name: str(input.name),
    email: str(input.email),
    company: str(input.company),
    their_work: str(input.their_work),
    notes: str(input.notes),
    tags: parseTags(input.tags),
  };
  if (!value.name && !value.email) {
    errors.push('Enter at least a name or an email address.');
  }
  if (value.name.length > 120) errors.push('Name is too long (120 characters max).');
  if (value.email && !EMAIL_RE.test(value.email)) {
    errors.push('That email address does not look valid.');
  }
  for (const field of ['company', 'their_work', 'notes']) {
    if (value[field].length > 2000) errors.push('Field "' + field + '" is too long (2000 characters max).');
  }
  return { ok: errors.length === 0, errors, value };
}
function validateTemplate(input) {
  const errors = [];
  const value = {
    name: str(input.name),
    serviceName: str(input.serviceName) || 'General',
    subject: str(input.subject),
    body: typeof input.body === 'string' ? input.body.replace(/\r\n/g, '\n') : '',
  };
  if (!value.name) errors.push('Give the template a name.');
  if (!value.subject) errors.push('Add a subject line.');
  if (!value.body.trim()) errors.push('Add a message body.');
  if (value.name.length > 120) errors.push('Template name is too long.');
  if (value.body.length > 20000) errors.push('Template body is too long (20000 characters max).');
  return { ok: errors.length === 0, errors, value };
}
function validateSettings(input) {
  const errors = [];
  const value = {
    senderName: str(input.senderName),
    contactEmail: str(input.contactEmail),
    myOffer: str(input.myOffer),
  };
  if (!value.senderName) errors.push('Your name is used by nearly every template. Add it in Settings.');
  if (value.contactEmail && !EMAIL_RE.test(value.contactEmail)) errors.push('That contact email does not look valid.');
  if (value.contactEmail && !value.myOffer) {
    value.myOffer = value.contactEmail ? 'email me at ' + value.contactEmail : value.myOffer;
  }
  const target = parseInt(input.dailyTarget, 10);
  if (Number.isNaN(target) || target < 1 || target > 50) errors.push('Daily outreach target must be between 1 and 50.');
  else value.dailyTarget = target;
  return { ok: errors.length === 0, errors, value };
}
module.exports = {
  ValidationError,
  escapeHtml,
  isValidDateISO,
  isValidEmail,
  parseTags,
  validateProspect,
  validateSettings,
  validateTemplate,
};
