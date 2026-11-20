'use strict';
/**
 * Data layer: a single JSON file with atomic writes.
 *
 * Why a JSON file instead of SQLite?
 *  - Zero dependencies and zero native compilation: `node src/server.js` just
 *    works on any computer with Node 18+.
 *  - The file is human-readable and easy to back up by copying it.
 *  - Plenty for one person's pipeline (comfortably thousands of prospects).
 * A documented upgrade path to SQLite is in the README if you ever exceed it.
 */
const fs = require('fs');
const path = require('path');
const { defaultSettings, seedTemplates } = require('./seeds');
const DATA_DIR = process.env.CADENCE_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = null;
function load() {
  if (db) return db;
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (
      !parsed ||
      !Array.isArray(parsed.prospects) ||
      !Array.isArray(parsed.activities) ||
      !Array.isArray(parsed.templates) ||
      !parsed.meta || typeof parsed.meta.nextId !== 'number'
    ) {
      throw new Error('Unrecognized data file');
    }
    db = parsed;
    db.prospects.forEach(p => { if (!Array.isArray(p.tags)) p.tags = []; });
    if (!db.settings) db.settings = defaultSettings();
  } catch (err) {
    db = {
      meta: { version: 1, nextId: 1 },
      prospects: [],
      activities: [],
      templates: seedTemplates(),
      settings: defaultSettings(),
    };
    save();
  }
  return db;
}
/** Atomic write: temp file then rename, so a crash never corrupts data. */
function save() {
  if (!db) return;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}
function nextId() {
  load();
  const id = db.meta.nextId;
  db.meta.nextId += 1;
  return id;
}
// ---- Prospects ----
function createProspect(fields) {
  load();
  const now = new Date().toISOString();
  const prospect = Object.assign(
    {
      id: nextId(),
      stage: 'new',
      scheduledFor: null,
      createdAt: now,
      updatedAt: now,
    },
    fields
  );
  db.prospects.push(prospect);
  save();
  return prospect;
}
function listProspects() {
  load();
  return db.prospects
    .slice()
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}
function getProspect(id) {
  load();
  const num = Number(id);
  return db.prospects.find(p => p.id === num) || null;
}
function updateProspect(id, patch) {
  const prospect = getProspect(id);
  if (!prospect) return null;
  Object.assign(prospect, patch, { updatedAt: new Date().toISOString() });
  save();
  return prospect;
}
/** Deletes a prospect and its activity history. */
function deleteProspect(id) {
  load();
  const num = Number(id);
  const before = db.prospects.length;
  db.prospects = db.prospects.filter(p => p.id !== num);
  db.activities = db.activities.filter(a => a.prospectId !== num);
  save();
  return db.prospects.length < before;
}
// ---- Activities ----
function createActivity(fields) {
  load();
  const activity = Object.assign({ id: nextId(), createdAt: new Date().toISOString() }, fields);
  db.activities.push(activity);
  save();
  return activity;
}
function activitiesFor(prospectId) {
  load();
  const num = Number(prospectId);
  return db.activities
    .filter(a => a.prospectId === num)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt).localeCompare(String(a.createdAt)));
}
function allActivities() {
  load();
  return db.activities;
}
function countOutbound(prospectId) {
  load();
  const num = Number(prospectId);
  return db.activities.filter(a => a.prospectId === num && a.type === 'outbound').length;
}
// ---- Templates ----
function listTemplates() {
  load();
  return db.templates.slice();
}
function getTemplate(id) {
  load();
  const num = Number(id);
  return db.templates.find(t => t.id === num) || null;
}
function createTemplate(fields) {
  load();
  const template = Object.assign({ id: nextId() }, fields);
  db.templates.push(template);
  save();
  return template;
}
function updateTemplate(id, patch) {
  const template = getTemplate(id);
  if (!template) return null;
  Object.assign(template, patch);
  save();
  return template;
}
function deleteTemplate(id) {
  load();
  const num = Number(id);
  const before = db.templates.length;
  db.templates = db.templates.filter(t => t.id !== num);
  save();
  return db.templates.length < before;
}
// ---- Settings ----
function getSettings() {
  load();
  return db.settings;
}
function updateSettings(patch) {
  load();
  Object.assign(db.settings, patch);
  save();
  return db.settings;
}
module.exports = {
  DB_FILE,
  allActivities,
  activitiesFor,
  countOutbound,
  createActivity,
  createProspect,
  createTemplate,
  deleteProspect,
  deleteTemplate,
  getProspect,
  getSettings,
  getTemplate,
  listProspects,
  listTemplates,
  load,
  save,
  updateProspect,
  updateSettings,
  updateTemplate,
};
