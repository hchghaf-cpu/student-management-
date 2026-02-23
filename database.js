const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// On Vercel (and most serverless platforms) the project root is read-only.
// The only writable directory is /tmp.  Locally we keep the DB next to the code.
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'students.db')
  : path.join(__dirname, 'students.db');

let db = null;

/* ── Public: init (must be awaited once at startup) ── */
async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  seedIfEmpty();
  console.log('  SQLite (sql.js/WASM) database ready');
}

/* ── Public: execute a SELECT – returns array of plain objects ── */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/* ── Public: execute a SELECT – returns first row or null ── */
function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

/* ── Public: execute INSERT / UPDATE / DELETE ── */
function run(sql, params = []) {
  db.run(sql, params);
  const changes         = db.getRowsModified();
  const lastInsertRowid = queryOne('SELECT last_insert_rowid() AS lid').lid;
  persist();
  return { changes, lastInsertRowid };
}

/* ── Internal helpers ──────────────────────────────── */
function persist() {
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
  catch (e) { console.error('DB persist error:', e.message); }
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT  NOT NULL,
      email      TEXT  NOT NULL UNIQUE,
      phone      TEXT  DEFAULT '',
      course     TEXT  NOT NULL,
      grade      TEXT  DEFAULT '',
      dob        TEXT  DEFAULT '',
      address    TEXT  DEFAULT '',
      status     TEXT  NOT NULL DEFAULT 'Active',
      created_at TEXT  NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function seedIfEmpty() {
  const row = queryOne('SELECT COUNT(*) AS cnt FROM students');
  if (row && row.cnt > 0) return;

  const samples = [
    ['Alice Johnson',  'alice@example.com',  '555-0101', 'Computer Science', 'A', '2002-04-12', '123 Maple St',  'Active'],
    ['Bob Martinez',   'bob@example.com',    '555-0102', 'Mathematics',       'B', '2001-09-05', '456 Oak Ave',   'Active'],
    ['Carol Williams', 'carol@example.com',  '555-0103', 'Physics',           'A', '2003-01-22', '789 Pine Rd',   'Active'],
    ['David Brown',    'david@example.com',  '555-0104', 'Chemistry',         'C', '2002-07-18', '321 Elm Blvd',  'Inactive'],
    ['Eve Davis',      'eve@example.com',    '555-0105', 'Biology',           'B', '2001-11-30', '654 Cedar Ln',  'Active'],
  ];

  samples.forEach(([name, email, phone, course, grade, dob, address, status]) => {
    run(
      `INSERT INTO students (name,email,phone,course,grade,dob,address,status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name, email, phone, course, grade, dob, address, status]
    );
  });
}

module.exports = { initDB, queryAll, queryOne, run };
