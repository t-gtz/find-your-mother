-- Webcams Tabelle
CREATE TABLE IF NOT EXISTS webcams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    country TEXT,
    city TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    stream_url TEXT NOT NULL,
    stream_type TEXT DEFAULT 'http', -- hls, rtmp, http, mjpeg
    thumbnail_path TEXT,
    is_active BOOLEAN DEFAULT 1,
    category TEXT, -- traffic, nature, city, beach, other
    source TEXT, -- builtin, manual, import
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Favoriten (Optional - kann auch nur lokal sein)
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webcam_id TEXT NOT NULL UNIQUE REFERENCES webcams(id),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Einstellungen (App-Konfiguration)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_webcams_active ON webcams(is_active);
CREATE INDEX IF NOT EXISTS idx_webcams_city ON webcams(city, country);
CREATE INDEX IF NOT EXISTS idx_webcams_category ON webcams(category);

-- FTS5 Virtual Table for typo-tolerant / fast text search on name, description, city, country
CREATE VIRTUAL TABLE IF NOT EXISTS webcams_fts USING fts5(
        name, description, city, country,
        content='webcams', content_rowid='rowid'
);

-- Triggers to keep FTS index in sync with the `webcams` table
CREATE TRIGGER IF NOT EXISTS webcams_ai AFTER INSERT ON webcams BEGIN
    INSERT INTO webcams_fts(rowid, name, description, city, country) VALUES (new.rowid, new.name, new.description, new.city, new.country);
END;

CREATE TRIGGER IF NOT EXISTS webcams_ad AFTER DELETE ON webcams BEGIN
    INSERT INTO webcams_fts(webcams_fts, rowid) VALUES('delete', old.rowid);
END;

CREATE TRIGGER IF NOT EXISTS webcams_au AFTER UPDATE ON webcams BEGIN
    INSERT INTO webcams_fts(webcams_fts, rowid) VALUES('delete', old.rowid);
    INSERT INTO webcams_fts(rowid, name, description, city, country) VALUES (new.rowid, new.name, new.description, new.city, new.country);
END;

-- Populate FTS table for any existing rows (no-op if already populated)
INSERT INTO webcams_fts(rowid, name, description, city, country)
    SELECT rowid, name, description, city, country FROM webcams
    WHERE rowid NOT IN (SELECT rowid FROM webcams_fts);

-- Sample-Daten: Leer - echte Webcam-Daten kommen von der Windy API (/api/windy)
-- Die App lädt beim Start automatisch Webcams via Windy API

