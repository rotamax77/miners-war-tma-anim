const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'streaming.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
    // Create videos table
    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('film', 'serie', 'anime')),
        genre TEXT,
        language TEXT CHECK(language IN ('VF', 'VOSTFR', 'VO')),
        video_url TEXT NOT NULL UNIQUE,
        thumbnail_url TEXT,
        description TEXT,
        release_year INTEGER,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_working BOOLEAN DEFAULT 1
      )
    `, (err) => {
        if(err) {
            console.error('Error creating table videos:', err.message);
        } else {
            console.log('Videos table ready.');
        }
    });
});

module.exports = db;
