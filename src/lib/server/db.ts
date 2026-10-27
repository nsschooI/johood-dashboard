import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

type DB = Database.Database;

const MIGRATIONS: string[] = [
  // 1: sessions, audit log, preferences, permission overrides
  `
  CREATE TABLE sessions (
    token_hash   TEXT PRIMARY KEY,
    discord_id   TEXT NOT NULL,
    name         TEXT NOT NULL,
    avatar_url   TEXT,
    roles        TEXT NOT NULL,
    csrf         TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    expires_at   INTEGER NOT NULL,
    ip           TEXT,
    user_agent   TEXT
  );
  CREATE INDEX sessions_discord_id ON sessions(discord_id);
  CREATE INDEX sessions_expires_at ON sessions(expires_at);

  CREATE TABLE audit_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    at           TEXT NOT NULL,
    actor_id     TEXT NOT NULL,
    actor_name   TEXT NOT NULL,
    actor_roles  TEXT NOT NULL,
    action       TEXT NOT NULL,
    target       TEXT,
    reason       TEXT,
    before_json  TEXT,
    after_json   TEXT,
    ok           INTEGER NOT NULL,
    ip           TEXT
  );
  CREATE INDEX audit_at ON audit_log(at);
  CREATE INDEX audit_actor ON audit_log(actor_id);
  CREATE INDEX audit_action ON audit_log(action);
  CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
  CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log
    BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;

  CREATE TABLE user_prefs (
    discord_id   TEXT PRIMARY KEY,
    locale       TEXT,
    muted        INTEGER,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE permission_overrides (
    discord_id   TEXT NOT NULL,
    action       TEXT NOT NULL,
    effect       TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    set_by       TEXT NOT NULL,
    set_at       TEXT NOT NULL,
    PRIMARY KEY (discord_id, action)
  );
  `,
];

export function migrate(db: DB) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

export function openDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 3000");
  migrate(db);
  return db;
}

const g = globalThis as unknown as { __johoodDb?: DB };

/** Process-wide connection, opened lazily (never at build time). */
export function getDb(): DB {
  if (!g.__johoodDb) g.__johoodDb = openDb(path.resolve(env.dataDir, "johood.db"));
  return g.__johoodDb;
}

/** Tests swap in an in-memory database. */
export function setDbForTests(db: DB) {
  g.__johoodDb = db;
}
