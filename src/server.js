'use strict';
/**
 * Cadence Pipeline HTTP server. Node's built-in http module only: no
 * dependencies, no install step, nothing to break.
 *
 * Security posture:
 *  - Binds to 127.0.0.1 by default. Your data never leaves the machine.
 *  - All output is HTML-escaped; all bodies size-limited; all input validated.
 *  - No credentials are ever stored or requested.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const db = require('./db');
const pipelineMod = require('./pipeline');
const scheduler = require('./scheduler');
const viewsLayout = require('./views/layout');
const csvMod = require('./csv');
const { escapeHtml, isValidDateISO, validateProspect, validateSettings, validateTemplate, ValidationError } = require('./validate');
const viewsDashboard = require('./views/dashboardView');
const viewsProspect = require('./views/prospectViews');
const viewsTemplate = require('./views/templateViews');
const viewsSettings = require('./views/settingsView');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
// ---------------------------------------------------------------------------
// Tiny router
// ---------------------------------------------------------------------------
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$'
  );
  routes.push({ method, regex, keys, handler });
}
function matchRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.regex.exec(pathname);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { handler: r.handler, params };
    }
  }
  return null;
}
// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new HttpError(413, 'Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => reject(new HttpError(400, 'Could not read request body.')));
  });
}
async function parseForm(req) {
  const raw = await readBody(req);
  return Object.fromEntries(new URLSearchParams(raw));
}
function sendHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}
function errorPage(res, status, message) {
  const html = viewsLayout.layout(
    'Error',
    '<div class="flash flash-error">' + escapeHtml(message) + '</div>' +
    '<p><a class="btn btn-primary" href="/">Back to dashboard</a></p>'
  );
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function requireProspect(params) {
  const prospect = db.getProspect(params.id);
  if (!prospect) throw new HttpError(404, 'Prospect not found.');
  return prospect;
}
function ensureActive(prospect) {
  if (!pipelineMod.isStageActive(prospect.stage)) {
    throw new HttpError(409, 'This prospect is ' + pipelineMod.STAGE_LABELS[prospect.stage] + '; actions are locked.');
  }
}
// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
route('GET', '/', async (req, res) => {
  sendHtml(res, viewsDashboard.renderDashboard(scheduler.todayISO(), res.locals && res.locals.flash));
});
// ---------------------------------------------------------------------------
// Prospects
// ---------------------------------------------------------------------------
route('GET', '/prospects', async (req, res) => {
  const stage = new URL(req.url, 'http://x').searchParams.get('stage');
  let list = db.listProspects();
  if (stage && stage !== 'all') {
    if (!pipelineMod.isKnownStage(stage)) throw new HttpError(400, 'Unknown stage filter.');
    list = list.filter(p => p.stage === stage);
  }
  sendHtml(res, viewsProspect.renderProspectList(list, stage || 'all'));
});
route('GET', '/prospects/new', async (req, res) => {
  sendHtml(res, viewsProspect.renderProspectForm());
});
route('POST', '/prospects', async (req, res) => {
  const body = await parseForm(req);
  const result = validateProspect(body);
  if (!result.ok) {
    sendHtml(res, viewsProspect.renderProspectForm(body, result.errors));
    return;
  }
  const prospect = db.createProspect(result.value);
  redirect(res, '/prospects/' + prospect.id);
});
route('GET', '/prospects/import', async (req, res) => {
  sendHtml(res, viewsProspect.renderImportForm(null, null));
});
route('POST', '/prospects/import', async (req, res) => {
  const body = await parseForm(req);
  const parsed = csvMod.parseCsv(body.csv);
  if (parsed.rows.length === 0) {
    sendHtml(res, viewsProspect.renderImportForm(parsed.rows, parsed.problems.length ? parsed.problems.concat(['No data rows found. Include the header row?']) : ['Nothing to import: the text had no rows.']));
    return;
  }
  const candidates = csvMod.rowsToProspects(parsed.rows);
  let imported = 0;
  let skippedNameAndEmail = 0;
  const problems = parsed.problems.slice();
  for (const candidate of candidates) {
    const checked = validateProspect({ name: candidate.name, email: candidate.email, company: candidate.company, their_work: candidate.their_work, notes: candidate.notes, tags: candidate.tags });
    if (!checked.ok) { skippedNameAndEmail += 1; continue; }
    db.createProspect(checked.value);
    imported += 1;
  }
  if (skippedNameAndEmail) problems.push(skippedNameAndEmail + ' row(s) skipped: no name and no email.');
  const summary = 'Imported ' + imported + ' prospect(s).' + (problems.length ? ' See notes below.' : '');
  const noticeHtml = '<div class="flash ' + (imported ? 'flash-success' : 'flash-error') + '">' + escapeHtml(summary) + '</div>';
  const listHtml = viewsProspect.renderProspectList(db.listProspects(), 'all')
    .replace('<h1>Prospects</h1>', '<h1>Prospects</h1>' + noticeHtml +
      (problems.length ? '<ul class="hint">' + problems.map(p => '<li>' + escapeHtml(p) + '</li>').join('') + '</ul>' : ''));
  sendHtml(res, listHtml);
});
route('GET', '/prospects/:id', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  const query = new URL(req.url, 'http://x').searchParams;
  const opts = {
    today: scheduler.todayISO(),
    templateId: query.get('templateId'),
    message: null,
    errors: null,
  };
  if (!query.get('compose') && !query.get('templateId')) {
    const picks = db.listTemplates();
    if (picks.length === 0) opts.message = 'No templates yet. Add one on the Templates page first.';
  }
  sendHtml(res, viewsProspect.renderProspectDetail(prospect, opts));
});
route('POST', '/prospects/:id/log-reply', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  ensureActive(prospect);
  const body = await parseForm(req);
  const date = isValidDateISO(body.date) ? body.date : scheduler.todayISO();
  db.createActivity({ prospectId: prospect.id, type: 'reply', date, note: typeof body.note === 'string' ? body.note.slice(0, 2000) : '' });
  const patch = { scheduledFor: scheduler.addDays(date, 2) }; // respond-to-reply reminder
  if (prospect.stage === 'contacted' || prospect.stage === 'new') patch.stage = 'replied';
  db.updateProspect(prospect.id, patch);
  redirect(res, '/prospects/' + prospect.id);
});
route('POST', '/prospects/:id/log-message', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  ensureActive(prospect);
  const body = await parseForm(req);
  const errors = [];
  const subject = (typeof body.subject === 'string' ? body.subject.trim() : '');
  const messageBody = (typeof body.body === 'string' ? body.body.trim() : '');
  if (!subject) errors.push('A subject line is required.');
  if (!messageBody) errors.push('A message body is required.');
  // Unfilled data tokens render as [token_name]; catch that before it goes
  // out. Prose brackets with spaces (personalization prompts) never match
  // this pattern, so they never block a send.
  let warning = null;
  if (/\[[A-Za-z0-9_]+\]/.test(subject) || /\[[A-Za-z0-9_]+\]/.test(messageBody)) {
    warning = 'An unfilled token like [name] is still in the text. Replace it before sending.';
  }
  const date = isValidDateISO(body.date) ? body.date : scheduler.todayISO();
  if (errors.length || warning) {
    sendHtml(res, viewsProspect.renderProspectDetail(db.getProspect(prospect.id), {
      today: scheduler.todayISO(),
      templateId: body.templateId,
      draftSubject: subject,
      draftBody: body.body,
      errors,
      composerFlash: warning ? viewsLayout.flash(warning, 'warning') : '',
      templateId_lock: body.templateId,
    }));
    return;
  }
const outboundCount = db.countOutbound(prospect.id) + 1;
  db.createActivity({
    prospectId: prospect.id,
    type: 'outbound',
    date,
    subject: subject.slice(0, 500),
    body: messageBody.slice(0, 5000),
    templateId: body.templateId ? Number(body.templateId) : null,
  });
  const patch = { scheduledFor: scheduler.followUpAfter(outboundCount, date) };
  if (prospect.stage === 'new') patch.stage = 'contacted';
  db.updateProspect(prospect.id, patch);
  redirect(res, '/prospects/' + prospect.id);
});
route('POST', '/prospects/:id/note', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  ensureActive(prospect);
  const body = await parseForm(req);
  const note = (typeof body.note === 'string' ? body.note.trim() : '');
  if (!note) {
    errorPage(res, 400, 'Empty note, nothing to save.');
    return;
  }
  db.createActivity({ prospectId: prospect.id, type: 'note', date: scheduler.todayISO(), note: note.slice(0, 2000) });
  redirect(res, '/prospects/' + prospect.id);
});
route('POST', '/prospects/:id/schedule', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  ensureActive(prospect);
  const body = await parseForm(req);
  if (!isValidDateISO(body.date)) {
    errorPage(res, 400, 'Enter a valid date in YYYY-MM-DD form.');
    return;
  }
  db.updateProspect(prospect.id, { scheduledFor: body.date });
  redirect(res, '/prospects/' + prospect.id);
});
route('POST', '/prospects/:id/stage', async (req, res) => {
  const prospect = requireProspect(req.locals.params);
  const body = await parseForm(req);
  const to = String(body.stage || '');
  try {
    pipelineMod.assertTransition(prospect, to, db.countOutbound(prospect.id) > 0);
  } catch (err) {
    errorPage(res, 409, err.message);
    return;
  }
  const patch = { stage: to };
  if (to === 'won' || to === 'lost') patch.scheduledFor = null;
  db.createActivity({ prospectId: prospect.id, type: 'stage', date: scheduler.todayISO(), detail: pipelineMod.STAGE_LABELS[prospect.stage] + ' → ' + pipelineMod.STAGE_LABELS[to] });
  db.updateProspect(prospect.id, patch);
  redirect(res, '/prospects/' + prospect.id);
});
route('POST', '/prospects/:id/delete', async (req, res) => {
  requireProspect(req.locals.params);
  db.deleteProspect(req.locals.params.id);
  redirect(res, '/prospects');
});
// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
route('GET', '/templates', async (req, res) => {
  sendHtml(res, viewsTemplate.renderTemplateList(db.listTemplates()));
});
route('GET', '/templates/new', async (req, res) => {
  sendHtml(res, viewsTemplate.renderTemplateForm());
});
route('POST', '/templates', async (req, res) => {
  const body = await parseForm(req);
  const result = validateTemplate(body);
  if (!result.ok) {
    sendHtml(res, viewsTemplate.renderTemplateForm(body, result.errors));
    return;
  }
  const template = db.createTemplate(result.value);
  redirect(res, '/templates/' + template.id);
});
route('GET', '/templates/:id', async (req, res) => {
  const template = db.getTemplate(req.locals.params.id);
  if (!template) throw new HttpError(404, 'Template not found.');
  sendHtml(res, viewsTemplate.renderTemplateForm(template, [], template.id));
});
route('POST', '/templates/:id', async (req, res) => {
  const template = db.getTemplate(req.locals.params.id);
  if (!template) throw new HttpError(404, 'Template not found.');
  const body = await parseForm(req);
  const result = validateTemplate(body);
  if (!result.ok) {
    sendHtml(res, viewsTemplate.renderTemplateForm(body, result.errors, template.id));
    return;
  }
  db.updateTemplate(template.id, result.value);
  sendHtml(res, viewsTemplate.renderTemplateList(db.listTemplates()));
});
route('POST', '/templates/:id/delete', async (req, res) => {
  const template = db.getTemplate(req.locals.params.id);
  if (!template) throw new HttpError(404, 'Template not found.');
  db.deleteTemplate(template.id);
  redirect(res, '/templates');
});
// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
route('GET', '/settings', async (req, res) => {
  sendHtml(res, viewsSettings.renderSettings({}, [], false));
});
route('POST', '/settings', async (req, res) => {
  const body = await parseForm(req);
  const result = validateSettings(body);
  if (!result.ok) {
    sendHtml(res, viewsSettings.renderSettings(body, result.errors, false));
    return;
  }
  db.updateSettings(result.value);
  sendHtml(res, viewsSettings.renderSettings({}, [], true));
});
// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------
const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
route('GET', '/public/:file', async (req, res) => {
  const name = req.locals.params.file;
  const safe = path.join(PUBLIC_DIR, path.basename(name));
  if (!safe.startsWith(PUBLIC_DIR) || !fs.existsSync(safe)) throw new HttpError(404, 'Not found.');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(safe)] || 'application/octet-stream' });
  res.end(fs.readFileSync(safe));
});
// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const matched = matchRoute(req.method === 'HEAD' ? 'GET' : req.method, pathname);
  try {
    if (!matched) throw new HttpError(404, 'Page not found: ' + pathname);
    req.locals = { params: matched.params, query: url.searchParams };
    await matched.handler(req, res);
  } catch (err) {
    if (err instanceof ValidationError) {
      errorPage(res, 400, err.errors.join(' '));
    } else if (err instanceof HttpError) {
      errorPage(res, err.status, err.message);
    } else if (err instanceof pipelineMod.PipelineError) {
      errorPage(res, 409, err.message);
    } else {
      console.error('Unhandled error:', err);
      errorPage(res, 500, 'Something went wrong on the server. Your data file was not touched by this failure.');
    }
  }
});
db.load(); // fail fast at startup (and seed) rather than mid-request
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('Cadence Pipeline running at http://127.0.0.1:' + PORT);
    console.log('Data file: ' + db.DB_FILE);
  });
}
module.exports = { server, route, parseForm };
