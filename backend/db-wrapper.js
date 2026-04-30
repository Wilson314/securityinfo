const fs = require('fs');

// Convert better-sqlite3 @param style → $param for sql.js
function convertSql(sql) {
  return sql.replace(/@(\w+)/g, (_, n) => '$' + n);
}

// Convert params to sql.js compatible format
function toSqlParams(params) {
  if (params === null || params === undefined) return [];
  if (Array.isArray(params)) return params;
  if (typeof params === 'object') {
    // Named params object: { key: val } → { $key: val }
    const r = {};
    for (const [k, v] of Object.entries(params)) r['$' + k] = v;
    return r;
  }
  // Primitive (string/number) → wrap in array for positional binding
  return [params];
}

class Stmt {
  constructor(stmt, dbw, sql) {
    this._s = stmt;
    this._db = dbw;
    this._write = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)/i.test(sql);
  }

  run(...args) {
    let p;
    if (args.length === 0) p = [];
    else if (args.length === 1) p = toSqlParams(args[0]);
    else p = args;
    try { this._s.bind(p); this._s.step(); } finally { this._s.reset(); }
    let lastInsertRowid = null;
    if (this._write) {
      try {
        const r = this._db._d.exec('SELECT last_insert_rowid()');
        if (r && r.length) lastInsertRowid = r[0].values[0][0];
      } catch {}
      this._db._save();
    }
    return { lastInsertRowid };
  }

  get(...args) {
    let p;
    if (args.length === 0) p = [];
    else if (args.length === 1) p = toSqlParams(args[0]);
    else p = args;
    try {
      this._s.bind(p);
      if (this._s.step()) return this._s.getAsObject();
      return undefined;
    } finally { this._s.reset(); }
  }

  all(...args) {
    let p;
    if (args.length === 0) p = [];
    else if (args.length === 1) p = toSqlParams(args[0]);
    else p = args; // multiple positional args spread (e.g. all(startDate, endDate))
    const rows = [];
    try {
      this._s.bind(p);
      while (this._s.step()) rows.push(this._s.getAsObject());
    } finally { this._s.reset(); }
    return rows;
  }
}

class DbWrapper {
  constructor(d, savePath) {
    this._d = d;
    this._path = savePath;
    this._tx = false;
  }
  _save() {
    if (!this._tx) {
      try { fs.writeFileSync(this._path, Buffer.from(this._d.export())); } catch {}
    }
  }
  exec(sql) {
    this._d.run(sql);
    this._save();
    return this;
  }
  pragma(s) {
    try { this._d.run('PRAGMA ' + s); } catch {}
    return this;
  }
  prepare(sql) {
    return new Stmt(this._d.prepare(convertSql(sql)), this, sql);
  }
  transaction(fn) {
    return (...args) => {
      this._d.run('BEGIN TRANSACTION');
      this._tx = true;
      try {
        const r = fn(...args);
        this._d.run('COMMIT');
        this._tx = false;
        this._save();
        return r;
      } catch (e) {
        try { this._d.run('ROLLBACK'); } catch {}
        this._tx = false;
        throw e;
      }
    };
  }
}

module.exports = { DbWrapper };
