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

-- Sample-Daten (beim ersten Start)
INSERT OR IGNORE INTO webcams 
(id, name, city, country, latitude, longitude, stream_url, stream_type, category, source)
VALUES
('de-berlin-001', 'Berlin Fernsehturm', 'Berlin', 'Deutschland', 52.5200, 13.4050, 'http://example.com/berlin', 'http', 'city', 'builtin'),
('de-hamburg-001', 'Hamburg Hafen', 'Hamburg', 'Deutschland', 53.5511, 9.9850, 'http://example.com/hamburg', 'http', 'city', 'builtin'),
('de-munich-001', 'München Marienplatz', 'München', 'Deutschland', 48.1351, 11.5820, 'http://example.com/munich', 'http', 'city', 'builtin'),
('de-cologne-001', 'Köln Dom', 'Köln', 'Deutschland', 50.9413, 6.9581, 'http://example.com/cologne', 'http', 'city', 'builtin'),
('ch-zurich-001', 'Zürich Main Street', 'Zürich', 'Schweiz', 47.3769, 8.5472, 'http://example.com/zurich', 'http', 'city', 'builtin'),
('at-vienna-001', 'Wien Stephansdom', 'Wien', 'Österreich', 48.2082, 16.3738, 'http://example.com/vienna', 'http', 'city', 'builtin');
