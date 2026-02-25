import Database from 'better-sqlite3';

const db = new Database('grocery.db');

// Initialize tables
console.log('Initializing database...');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS grocery_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    raw_text TEXT NOT NULL,
    parsed_items TEXT NOT NULL, -- JSON string
    total_cost REAL NOT NULL,
    store_recommendation TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    explanation TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export default db;
