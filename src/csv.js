'use strict';
/**
 * Small RFC-4180-style CSV parser for prospect import: handles quoted fields,
 * escaped quotes (""), commas inside quotes, and \r\n line endings.
 * Returns { headers: [...], rows: [{header: value}] }. Rows with a wrong
 * column count are reported in `problems`.
 */
function parseCsv(text) {
  const source = String(text === undefined || text === null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  // Final row without trailing newline
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter(r => r.some(cell => cell.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [], problems: [] };
  const headers = nonEmpty[0].map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const records = [];
  const problems = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = nonEmpty[i];
    if (cells.length !== headers.length) {
      problems.push('Row ' + (i + 1) + ' has ' + cells.length + ' columns, expected ' + headers.length + '. Skipped.');
      continue;
    }
    const record = {};
    headers.forEach((h, idx) => { record[h] = cells[idx].trim(); });
    records.push(record);
  }
  return { headers, rows: records, problems };
}
/** Maps CSV columns to prospect fields; unknown columns become notes line. */
function rowsToProspects(records) {
  const known = ['name', 'email', 'company', 'their_work', 'tags'];
  const prospects = [];
  for (const record of records) {
    const prospect = {};
    for (const key of known) {
      if (record[key] !== undefined) prospect[key] = record[key];
    }
    const extra = Object.keys(record)
      .filter(k => !known.includes(k) && record[k].trim() !== '')
      .map(k => k + ': ' + record[k].trim());
    prospect.notes = [record.notes || ''].concat(extra).filter(Boolean).join('\n');
    prospects.push(prospect);
  }
  return prospects;
}
module.exports = { parseCsv, rowsToProspects };
