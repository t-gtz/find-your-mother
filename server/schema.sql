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

-- Sample-Daten: Leer - echte Webcam-Daten kommen von der Windy API (/api/windy)
-- Die App lädt beim Start automatisch Webcams via Windy API

