import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";

let SQL: any;
let db: SqlJsDatabase;

const DB_FILE = "./data.db";

export async function initDb() {
  if (!SQL) SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const file = fs.readFileSync(DB_FILE);
    db = new SQL.Database(file);
  } else {
    db = new SQL.Database();

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS generations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        prompt TEXT,
        style TEXT,
        image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
  `);

    saveDb();
  }
}

export function getDb() {
  if (!db) throw new Error("DB not initialised. Call initDb() first.");
  return db;
}

export function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}
