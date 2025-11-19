import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

let SQL: any;
let db: SqlJsDatabase;

// Use environment variable or default to data/data.db
const DB_FILE = process.env.DB_PATH || path.join(__dirname, "../../data/data.db");

export async function initDb() {
  console.log("🔧 Initializing database at:", DB_FILE);

  if (!SQL) {
    console.log("📦 Loading SQL.js...");
    SQL = await initSqlJs();
  }

  // Ensure directory exists
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    console.log("📁 Creating database directory:", dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    console.log("📂 Loading existing database from:", DB_FILE);
    const file = fs.readFileSync(DB_FILE);
    db = new SQL.Database(file);

    // Add migration for existing databases
    try {
      // Check if image_url column exists
      const result = db.exec("PRAGMA table_info(generations)");
      const columns = result[0]?.values.map(row => row[1]) || [];

      if (!columns.includes('image_url')) {
        console.log('🔄 Migrating database: adding image_url column...');
        db.exec('ALTER TABLE generations ADD COLUMN image_url TEXT');
        saveDb();
      }
    } catch (e) {
      console.error('⚠️  Migration error:', e);
    }
  } else {
    console.log("📂 Creating new database at:", DB_FILE);
    db = new SQL.Database();

    console.log("📋 Creating users table...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("📋 Creating generations table...");
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

    console.log("💾 Saving initial database...");
    saveDb();
  }

  console.log("✅ Database initialized successfully");
}

export function getDb() {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db;
}

export function saveDb() {
  if (!db) throw new Error("DB not initialized");

  const data = db.export();
  const buffer = Buffer.from(data);

  // Ensure directory exists before writing
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  fs.writeFileSync(DB_FILE, buffer);
}