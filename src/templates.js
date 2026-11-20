'use strict';
/**
 * Message template engine. Tokens look like {{name}} (with optional internal
 * whitespace). Tokens without a value are rendered as [token_name] so the
 * missing personalization is impossible to miss before sending; the list of
 * missing tokens is returned alongside the text.
 */
const TOKEN_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
function renderTemplate(text, vars) {
  const missing = new Set();
  const filled = String(text === undefined || text === null ? '' : text).replace(
    TOKEN_RE,
    (whole, key) => {
      const value = vars[key];
      if (value === undefined || value === null || String(value).trim() === '') {
        missing.add(key);
        return '[' + key + ']';
      }
      return String(value);
    }
  );
  return { text: filled, missing: Array.from(missing) };
}
function varsForProspect(prospect, settings) {
  return {
    name: prospect && prospect.name,
    email: prospect && prospect.email,
    company: prospect && prospect.company,
    their_work: prospect && prospect.their_work,
    sender_name: settings && settings.senderName,
    contact_email: settings && settings.contactEmail,
    my_offer: settings && settings.myOffer,
  };
}
/** Renders subject + body for a prospect, merging missing tokens. */
function renderForProspect(prospect, template, settings) {
  const vars = varsForProspect(prospect, settings);
  const subject = renderTemplate(template.subject, vars);
  const body = renderTemplate(template.body, vars);
  const seen = new Set(subject.missing);
  const missing = subject.missing.concat(body.missing.filter(k => !seen.has(k)));
  return { subject: subject.text, body: body.text, missing };
}
/** Tokens referenced by a template, without duplicates. */
function tokensIn(text) {
  const found = new Set();
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(String(text))) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}
module.exports = { renderTemplate, renderForProspect, tokensIn, varsForProspect };
