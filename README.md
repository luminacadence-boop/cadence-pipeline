# Cadence Pipeline
A local-first outreach and follow-up pipeline for a freelance writer, editor,
and independent publisher. It exists to answer one question every morning:
> **Who do I owe a message today, and what exactly should I say?**
No accounts, no cloud, no monthly fees. All data lives in one JSON file on
your machine.
---
## Why this exists
Freelance and book-business outreach fails in predictable ways: prospects are
researched but never contacted, first messages are sent but follow-ups are
forgotten (most freelance work closes on the third to fifth touch, not the
first), and nobody can prove at the end of a week that any outreach happened
at all. Cadence Pipeline makes the daily number visible, drafts the message,
schedules the follow-up automatically, and keeps the evidence.
The design follows three deliberate rules:
1. **Evidence, not intentions.** You cannot mark a prospect "Contacted"
   without logging a sent message. Stage changes require receipts.
2. **The system schedules; you don't carry it in your head.** Every sent
   message automatically schedules the next follow-up (after 4, then 6, then
   10 days). When the ladder runs out, the prospect comes off the clock so
   you can decide: keep warm, or close the loop.
3. **You press send.** The app drafts and tracks; it never emails anybody by
   itself. You review each message, fill personalization slots, and send it
   from your own inbox. That protects your sender reputation and keeps you
   spam-compliant.
## Requirements
- **Node.js 18 or newer** (any OS: Windows, macOS, Linux). No other
  dependencies, no `npm install`. Check with `node --version`.
## Quick start
```bash
cd cadence-pipeline
node src/server.js
```
Then open **http://127.0.0.1:3000** in a browser. First run creates
`data/db.json` with four starter templates.
To stop: press `Ctrl+C` in the terminal.
Optional settings via environment variables:
- `PORT` (default 3000)
- `HOST` (default `127.0.0.1`; keep it local unless you add authentication)
- `CADENCE_DATA_DIR` (default `./data`)
## First ten minutes
1. **Settings** → enter your name, contact email, one-line offer, and a daily
   outreach target (default 10; a target of 5-10 quality messages a day is a
   realistic, sustainable floor).
2. **Prospects → Add prospect** for each real person: authors who need
   editing, small businesses with weak web copy, reviewers and newsletter
   owners for the book business. The `their_work` field fills the
   `{{their_work}}` token everywhere.
3. Open a prospect → pick a template → **edit the bracketed slots** (they are
   personalization prompts, meant for you) → **Log as sent**. The app moves
   them to Contacted, logs the message, and schedules the follow-up.
4. When they reply, press **They replied!** The app moves them to Replied and
   schedules a two-day respond reminder.
5. Start each day at the **Dashboard**: follow-ups due today, fresh prospects
   ready, and how you are doing against the daily target.
## CSV import
Prospects → Import CSV. Paste text including the header row:
```
name,email,company,their_work,tags,notes
Dana Reyes,dana@ example.com,North Pages Press,The Salt Road,author;needs-editing,Met via writing group
```
Tags are comma-separated inside the `tags` column. Unknown columns (budget,
city, anything) are folded into the notes automatically.
## Tests
```bash
npm test
```
Runs the built-in Node test runner over the core logic: template rendering,
pipeline transition rules, follow-up scheduling (including month and year
boundaries), validation, escaping, and CSV parsing. 40+ assertions across
five test files. Data-layer and HTTP handlers are exercised by normal use;
add an integration test there if you extend the API.
## Where your data lives and how to protect it
- Everything is in `data/db.json` (human-readable; back it up by copying it).
- The server binds to `127.0.0.1` only. Do not expose it to the internet
  without adding authentication first — it has none by design, because it is
  a single-user local tool.
- No credentials, API keys, or secrets are stored or requested by the app.
- Deleting the data file resets to the seeded templates.
## Honest limits (v1)
- **Sending is manual, by design.** No SMTP, no service integrations yet.
- **The JSON store** is comfortable for one person's pipeline (thousands of
  prospects). If you ever outgrow it, the data module is isolated in
  `src/db.js` and can be swapped for SQLite (`node:sqlite`) behind the same
  function signatures.
- **One process, single user.** Fine for this use; not a multi-user SaaS.
- The starter templates are good defaults but not magic: one specific,
  genuine observation about the recipient's work outsells any template.
## Roadmap (in the order value actually arrives)
1. **Proposal & pricing module** — scoped proposals and rate floor tracking
   for prospects that reach the Negotiating stage.
2. **Book-business mode** — a saved filter + templates aimed at reviewers,
   newsletter owners, and affiliates for The Human Operating System.
3. **Optional AI drafting** — a Mistral API key (stored in an environment
   variable, never hardcoded) to draft the personalization slot from the
   prospect's notes. The app works fully without it.
4. **Weekly review page** — a Friday summary: sends, replies, stage changes,
   and what stalled, mirroring the series' weekly integration structure.
