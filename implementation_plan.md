# Implementation Plan: Lokale Web-basierte Video-Informations-Software

> [!CAUTION]
> **User Review Required: Missing Node.js / Docker Environment**
> 
> I noticed that neither Node.js nor Docker is currently installed on this system. The current implementation plan relies on Node.js/Express for the backend and React/Vite (which requires npm) for the frontend.
> 
> **How would you like to proceed?**
> 1. **Implement as is:** I will generate the Node.js and React code exactly as specified. You will need to install Node.js or Docker to actually run the application.
> 2. **Adapt to Python:** Since Python 3.14 is installed on your system, I can adapt the plan to use a Python backend (e.g., Flask/FastAPI) and a No-Build Frontend (React via CDN or Vanilla JS) so you can run the app immediately without additional installations.
>
> Please let me know your preference!

## 1. Projektübersicht

### 1.1 Ziel
Entwicklung einer **lokalen Web-Anwendung** (läuft auf `localhost:PORT`) zur Verwaltung, Visualisierung und zum Streaming von öffentlichen Webcams mit kartographischer Lokalisierung. Kein Login erforderlich - **Direkter Zugriff über Website** im Browser, vollständig lokal gehostet.

### 1.2 Kernfunktionalität
- 🌐 **Website-basiert** - Läuft auf `http://localhost:3000` oder `http://192.168.1.100:3000`
- 🗺️ Kartendarstellung mit öffentlichen Webcam-Standorten
- 🎥 Live/gecachte Video-Streams anschauen
- 📍 Interaktive Karte mit Marker-Clustering
- 🔍 Suchfunktion & Filter (Stadt, Land, Kategorie)
- ⭐ Favoriten & Viewing History (lokal im Browser)
- 💾 Lokale Datenbank (SQLite oder IndexedDB)
- 📱 Responsive Design - funktioniert auf Desktop, Tablet, Mobile
- ♻️ Optional: Webcam-Liste online aktualisieren
- 🔓 **Kein Login/Authentifizierung** - Public Access

### 1.3 Zugriff
```
Installation:
1. App starten (Docker oder npm)
2. Browser öffnen
3. http://localhost:3000 eingeben
4. Sofort nutzbar - keine Registrierung

Netzwerk-Zugriff:
- Lokal: http://localhost:3000
- LAN: http://192.168.1.100:3000 (oder Hostname)
- Mobil im selben Netzwerk: Über LAN-IP
```

---

## 2. Technologie-Stack (Web-basiert, Lokal)

### 2.1 Empfohlene Architektur

```
┌─────────────────────────────────────────────────────────┐
│              DOCKER CONTAINER (oder npm)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Frontend (React/Vue SPA)                         │   │
│  │ ├─ Leaflet Karte                                │   │
│  │ ├─ Video-Player (HLS.js)                        │   │
│  │ ├─ Search & Filter UI                          │   │
│  │ ├─ IndexedDB (Browser Cache)                   │   │
│  │ └─ localStorage (Einstellungen)                 │   │
│  └──────────────────────────────────────────────────┘   │
│           ↕ REST API / JSON (lokal)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Backend (Node.js Express oder Python)           │   │
│  │ ├─ REST API Endpoints                          │   │
│  │ ├─ SQLite Datenbank                            │   │
│  │ ├─ Video-Stream Proxy                          │   │
│  │ ├─ File Serving (Karten, Thumbnails)          │   │
│  │ └─ Cache-Management                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Datenverzeichnis (/data):                              │
│  ├─ webcams.db (SQLite)                                │
│  ├─ cache/                                              │
│  ├─ map_tiles/                                          │
│  └─ thumbnails/                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer | Technologie | Grund |
|-------|-------------|-------|
| **Frontend** | React 18+ oder Vue 3 | SPA, schnell, responsive |
| **Kartenlibrary** | Leaflet.js + OpenStreetMap | Offline-fähig, leicht |
| **Video-Player** | HLS.js oder VideoJS | Streaming, Multi-Format |
| **Browser-Storage** | IndexedDB + localStorage | Lokal, keine Server-DB für Frontend |
| **HTTP-Client** | Fetch API oder Axios | Einfach, eingebaut |
| **Styling** | Tailwind CSS oder Bootstrap 5 | Responsive, schnell |
| **State Management** | Redux oder Pinia (optional) | Optional für komplexe States |
| **Backend** | Node.js/Express oder Python/Flask | Einfach, Single-Port |
| **Datenbank** | SQLite (in Docker) | Keine Konfiguration, eine Datei |
| **Containerisierung** | Docker + docker-compose | Ein Kommando zum Starten |

---

## 3. Architektur & Datenflusss

### 3.1 Deployment-Architektur

#### Option A: Single Docker Container (Empfohlen)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Frontend build
COPY src ./src
COPY public ./public
RUN npm run build  # → dist/

# Backend + Frontend serve
COPY server ./server
COPY server/schema.sql ./schema.sql

# Data volume
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  webcam-viewer:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_PATH: /app/data/webcams.db
```

**Start:**
```bash
docker-compose up
# → http://localhost:3000
```

---

#### Option B: npm run (Ohne Docker)
```json
{
  "scripts": {
    "build": "react-scripts build",
    "start": "node server/index.js",
    "dev": "concurrently \"react-scripts start\" \"node server/index.js\""
  }
}
```

**Start:**
```bash
npm install
npm start
# → http://localhost:3000
```

---

### 3.2 REST API (Lokal)

```
┌────────────────────────────────────┐
│  Browser                           │
│  http://localhost:3000             │
│  (React SPA)                       │
└────────────┬───────────────────────┘
             │ HTTP REST Requests
             ↓
┌────────────────────────────────────┐
│  Node.js Express Server            │
│  Port 3000                         │
│  (API + Static Files)              │
├────────────────────────────────────┤
│ API Endpoints:                     │
│ GET    /api/webcams                │
│ GET    /api/webcams/:id            │
│ GET    /api/stream/:id             │
│ POST   /api/favorites              │
│ DELETE /api/favorites/:id          │
│ GET    /api/search?q=...           │
│ GET    /api/settings               │
│ POST   /api/settings               │
│                                    │
│ Static Files:                      │
│ GET    /                           │
│ GET    /assets/*                   │
│ GET    /map-tiles/*                │
└────────────┬───────────────────────┘
             │
             ↓
┌────────────────────────────────────┐
│  SQLite Database                   │
│  /data/webcams.db                  │
└────────────────────────────────────┘
```

---

## 4. Detaillierte Komponenten

### 4.1 Backend (Node.js/Express)

#### `server/index.js` - Hauptserver
```javascript
const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/webcams.db';

// Middleware
app.use(compression());
app.use(express.json());
app.use(cors());

// Datenbank initialisieren
let db;
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else {
        // Schema prüfen & erstellen wenn nötig
        db.exec(require('./schema.sql'), (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

// ==================== API ENDPOINTS ====================

// GET /api/webcams - Alle Webcams (mit Pagination)
app.get('/api/webcams', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    `SELECT * FROM webcams 
     WHERE is_active = 1
     ORDER BY name ASC
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ webcams: rows, count: rows.length });
    }
  );
});

// GET /api/webcams/:id - Einzelne Webcam
app.get('/api/webcams/:id', (req, res) => {
  db.get(
    'SELECT * FROM webcams WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    }
  );
});

// GET /api/search - Suchfunktion
app.get('/api/search', (req, res) => {
  const keyword = req.query.q || '';
  const city = req.query.city || '';
  const category = req.query.category || '';
  const limit = parseInt(req.query.limit) || 50;

  let query = `
    SELECT * FROM webcams 
    WHERE is_active = 1
  `;
  const params = [];

  if (keyword) {
    query += ` AND (name LIKE ? OR description LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (city) {
    query += ` AND city LIKE ?`;
    params.push(`%${city}%`);
  }

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY name ASC LIMIT ?`;
  params.push(limit);

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/stream/:id - Stream-Info (für Frontend)
app.get('/api/stream/:id', (req, res) => {
  db.get(
    `SELECT id, name, stream_url, stream_type, thumbnail_path 
     FROM webcams WHERE id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });

      // Gebe Stream-Info zurück
      res.json({
        id: row.id,
        name: row.name,
        streamUrl: row.stream_url,
        streamType: row.stream_type,
        thumbnail: row.thumbnail_path 
          ? `/thumbnails/${row.thumbnail_path}` 
          : null
      });
    }
  );
});

// GET /api/thumbnails/:id - Thumbnail Download
app.get('/api/thumbnails/:id', (req, res) => {
  const thumbPath = path.join(__dirname, '../data/thumbnails', req.params.id);
  res.sendFile(thumbPath, (err) => {
    if (err) res.status(404).json({ error: 'Thumbnail not found' });
  });
});

// ==================== BROWSER STORAGE ENDPOINTS ====================
// Browser speichert Favoriten lokal (localStorage/IndexedDB)
// Optional: Server kann auch speichern

// GET /api/favorites - Alle Favoriten
app.get('/api/favorites', (req, res) => {
  db.all(
    `SELECT w.* FROM webcams w
     JOIN favorites f ON w.id = f.webcam_id
     ORDER BY f.added_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST /api/favorites - Favorit hinzufügen (optional, Server-side)
app.post('/api/favorites', express.json(), (req, res) => {
  const { webcamId } = req.body;

  db.run(
    'INSERT OR IGNORE INTO favorites (webcam_id) VALUES (?)',
    [webcamId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// DELETE /api/favorites/:id - Favorit entfernen
app.delete('/api/favorites/:id', (req, res) => {
  db.run(
    'DELETE FROM favorites WHERE webcam_id = ?',
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ==================== SETTINGS ====================

// GET /api/settings - App-Einstellungen
app.get('/api/settings', (req, res) => {
  db.all(
    'SELECT key, value FROM settings',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const settings = {};
      rows.forEach(row => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });

      res.json(settings);
    }
  );
});

// POST /api/settings - Settings aktualisieren
app.post('/api/settings', express.json(), (req, res) => {
  const { key, value } = req.body;

  db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, typeof value === 'object' ? JSON.stringify(value) : value],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ==================== STATIC FILES ====================

// Serve React SPA
app.use(express.static(path.join(__dirname, '../dist')));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Alle anderen Routes → index.html (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ==================== START ====================

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════════╗
    ║  🎥 Webcam Viewer Server                       ║
    ║                                                ║
    ║  🌐 Öffne: http://localhost:${PORT}             ║
    ║  📊 Health: http://localhost:${PORT}/health     ║
    ║  📁 Daten: ${DB_PATH}                          ║
    ║                                                ║
    ║  Kein Login erforderlich - direkter Zugriff    ║
    ╚════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
```

#### `server/schema.sql` - Datenbank-Schema
```sql
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
```

---

### 4.2 Frontend (React SPA)

#### `src/App.jsx` - Hauptkomponente
```javascript
import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import VideoPlayer from './components/VideoPlayer';
import SearchBar from './components/SearchBar';
import WebcamList from './components/WebcamList';
import Sidebar from './components/Sidebar';
import './App.css';

export default function App() {
  const [webcams, setWebcams] = useState([]);
  const [selectedWebcam, setSelectedWebcam] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lade Webcams beim Start
  useEffect(() => {
    fetchWebcams();
    loadFavorites();
  }, []);

  const fetchWebcams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/webcams?limit=500');
      const data = await response.json();
      setWebcams(data.webcams);
      setError(null);
    } catch (err) {
      setError(`Fehler beim Laden: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query, filters = {}) => {
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters
      });

      const response = await fetch(`/api/search?${params}`);
      const results = await response.json();
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelectWebcam = (webcam) => {
    setSelectedWebcam(webcam);
  };

  const toggleFavorite = (webcamId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(webcamId)) {
      newFavorites.delete(webcamId);
      // Optional: Server-seitig löschen
      fetch(`/api/favorites/${webcamId}`, { method: 'DELETE' });
      // Browser-Speicher
      localStorage.setItem(`favorite:${webcamId}`, 'false');
    } else {
      newFavorites.add(webcamId);
      // Optional: Server-seitig speichern
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webcamId })
      });
      // Browser-Speicher
      localStorage.setItem(`favorite:${webcamId}`, 'true');
    }
    setFavorites(newFavorites);
  };

  const loadFavorites = () => {
    const fav = new Set();
    webcams.forEach(w => {
      const isFav = localStorage.getItem(`favorite:${w.id}`) === 'true';
      if (isFav) fav.add(w.id);
    });
    setFavorites(fav);
  };

  const displayWebcams = searchResults.length > 0 ? searchResults : webcams;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>🎥 Webcam Viewer</h1>
          <p className="subtitle">Öffentliche Webcams interaktiv entdecken</p>
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          webcams={displayWebcams}
          onSearch={handleSearch}
          onSelectWebcam={handleSelectWebcam}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          selectedWebcam={selectedWebcam}
          isLoading={isLoading}
        />

        <div className="main-content">
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          {selectedWebcam ? (
            <div className="webcam-view">
              <div className="webcam-header">
                <button 
                  className="back-button"
                  onClick={() => setSelectedWebcam(null)}
                >
                  ← Zurück zur Karte
                </button>
                <h2>{selectedWebcam.name}</h2>
                <button
                  className={`favorite-button ${favorites.has(selectedWebcam.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(selectedWebcam.id)}
                >
                  {favorites.has(selectedWebcam.id) ? '★' : '☆'} Favorit
                </button>
              </div>

              <VideoPlayer webcam={selectedWebcam} />

              <div className="webcam-info">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Stadt:</label>
                    <span>{selectedWebcam.city}</span>
                  </div>
                  <div className="info-item">
                    <label>Land:</label>
                    <span>{selectedWebcam.country}</span>
                  </div>
                  <div className="info-item">
                    <label>Status:</label>
                    <span className={selectedWebcam.is_active ? 'status-online' : 'status-offline'}>
                      {selectedWebcam.is_active ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Kategorie:</label>
                    <span>{selectedWebcam.category || 'Sonstiges'}</span>
                  </div>
                </div>

                {selectedWebcam.description && (
                  <div className="description">
                    <p>{selectedWebcam.description}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="map-view">
              <MapComponent
                webcams={displayWebcams}
                onMarkerClick={handleSelectWebcam}
                selectedWebcam={selectedWebcam}
                favorites={favorites}
              />
            </div>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <p>💾 Alle Daten sind lokal gespeichert | Keine Anmeldung erforderlich</p>
      </footer>
    </div>
  );
}
```

#### `src/components/MapComponent.jsx`
```javascript
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

export default function MapComponent({
  webcams,
  onMarkerClick,
  selectedWebcam,
  favorites
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialisiere Karte
    const map = L.map(mapRef.current).setView([51.1657, 10.4515], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    // Marker Cluster Group
    const markerGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'large';
        if (count < 10) size = 'small';
        else if (count < 100) size = 'medium';

        return L.divIcon({
          html: `<div class="cluster-icon ${size}">${count}</div>`,
          iconSize: [40, 40]
        });
      }
    });

    // Füge Marker hinzu
    webcams.forEach(cam => {
      const isFavorite = favorites.has(cam.id);
      const isSelected = selectedWebcam?.id === cam.id;

      const markerColor = isFavorite ? '#fbbf24' : (cam.is_active ? '#3b82f6' : '#9ca3af');

      const marker = L.circleMarker(
        [cam.latitude, cam.longitude],
        {
          radius: isSelected ? 10 : 7,
          fillColor: markerColor,
          color: isSelected ? '#000' : '#fff',
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.9
        }
      );

      marker.bindPopup(`
        <div class="map-popup">
          <h4>${cam.name}</h4>
          <p>${cam.city}, ${cam.country}</p>
          <p class="status">${cam.is_active ? '🟢 Online' : '🔴 Offline'}</p>
          <button onclick="window.selectWebcam('${cam.id}')" class="popup-button">
            Ansehen
          </button>
        </div>
      `, {
        maxWidth: 250
      });

      marker.on('click', () => onMarkerClick(cam));

      markerGroup.addLayer(marker);
    });

    markerGroup.addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
    };
  }, [webcams, onMarkerClick, selectedWebcam, favorites]);

  return (
    <div 
      ref={mapRef}
      className="map-container"
      style={{ height: '100%', width: '100%' }}
    />
  );
}
```

#### `src/components/VideoPlayer.jsx`
```javascript
import React, { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';

export default function VideoPlayer({ webcam }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);

  useEffect(() => {
    if (!webcam || !videoRef.current) return;

    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);

        // Stream-Info vom Server abrufen
        const response = await fetch(`/api/stream/${webcam.id}`);
        const info = await response.json();
        setStreamInfo(info);

        const streamUrl = info.streamUrl;
        const streamType = info.streamType;
        const video = videoRef.current;

        // Abhängig vom Stream-Typ laden
        if (streamType === 'hls' && HLS.isSupported()) {
          const hls = new HLS();
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(HLS.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setError(`HLS Error: ${data.response?.statusText}`);
            }
          });
        } else if (streamType === 'http' || streamType === 'mjpeg') {
          video.src = streamUrl;
        } else {
          setError(`Stream-Typ nicht unterstützt: ${streamType}`);
        }

        video.play().catch(err => {
          setError(`Playback error: ${err.message}`);
        });
      } catch (err) {
        setError(`Fehler beim Laden des Streams: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStream();
  }, [webcam]);

  return (
    <div className="video-player-container">
      {loading && <div className="loading-spinner">Lädt Stream...</div>}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        className="video-player"
        style={{
          width: '100%',
          maxHeight: '600px',
          backgroundColor: '#000',
          borderRadius: '8px'
        }}
      />

      {streamInfo && (
        <div className="stream-info">
          <span className={`status-badge ${webcam.is_active ? 'online' : 'offline'}`}>
            {webcam.is_active ? '🔴 LIVE' : '⚫ OFFLINE'}
          </span>
          <span className="stream-type">{streamInfo.streamType.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
```

#### `src/components/SearchBar.jsx`
```javascript
import React, { useState, useEffect } from 'react';

export default function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);

  const handleSearch = () => {
    onSearch(query, {
      city: city,
      category: categories.length > 0 ? categories[0] : ''
    });
  };

  const handleClear = () => {
    setQuery('');
    setCity('');
    setCategories([]);
    onClear?.();
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 500);
    return () => clearTimeout(timer);
  }, [query, city, categories]);

  const toggleCategory = (cat) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [cat]
    );
  };

  return (
    <div className="search-container">
      <div className="search-input-group">
        <input
          type="text"
          placeholder="🔍 Webcam suchen (Name, Stadt)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="clear-button">✕</button>
        )}
      </div>

      <button 
        className="filter-toggle"
        onClick={() => setShowFilters(!showFilters)}
      >
        ⚙️ Filter {showFilters ? '▲' : '▼'}
      </button>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Stadt:</label>
            <input
              type="text"
              placeholder="z.B. Berlin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Kategorie:</label>
            <div className="category-buttons">
              {['city', 'traffic', 'nature', 'beach'].map(cat => (
                <button
                  key={cat}
                  className={`category-btn ${categories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat === 'city' && '🏙️'}
                  {cat === 'traffic' && '🚗'}
                  {cat === 'nature' && '🌲'}
                  {cat === 'beach' && '🏖️'}
                  {' '}
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### `src/components/Sidebar.jsx`
```javascript
import React, { useState } from 'react';
import SearchBar from './SearchBar';
import WebcamList from './WebcamList';

export default function Sidebar({
  webcams,
  onSearch,
  onSelectWebcam,
  favorites,
  onToggleFavorite,
  selectedWebcam,
  isLoading
}) {
  const [showFavorites, setShowFavorites] = useState(false);

  const displayWebcams = showFavorites
    ? webcams.filter(w => favorites.has(w.id))
    : webcams;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Webcams</h2>
        <span className="count">{webcams.length}</span>
      </div>

      <SearchBar onSearch={onSearch} />

      <div className="sidebar-tabs">
        <button
          className={`tab ${!showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(false)}
        >
          Alle ({webcams.length})
        </button>
        <button
          className={`tab ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(true)}
        >
          ⭐ ({favorites.size})
        </button>
      </div>

      <WebcamList
        webcams={displayWebcams}
        onSelectWebcam={onSelectWebcam}
        onToggleFavorite={onToggleFavorite}
        favorites={favorites}
        selectedWebcam={selectedWebcam}
        isLoading={isLoading}
      />
    </aside>
  );
}
```

#### `src/App.css` - Styling
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.header-content h1 {
  font-size: 28px;
  margin-bottom: 5px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 350px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.search-container {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.search-input-group {
  position: relative;
  display: flex;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.clear-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
}

.filter-toggle {
  width: 100%;
  padding: 8px;
  background: #f5f5f5;
  border: none;
  cursor: pointer;
  font-size: 13px;
  margin-top: 5px;
}

.filters-panel {
  padding: 10px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.filter-group {
  margin-bottom: 10px;
}

.filter-group label {
  display: block;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #666;
}

.filter-input {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.category-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
}

.category-btn {
  padding: 6px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.category-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #999;
  transition: all 0.2s;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-view {
  flex: 1;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.webcam-view {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.webcam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  gap: 10px;
}

.back-button {
  padding: 8px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.favorite-button {
  padding: 8px 12px;
  background: #fbbf24;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.favorite-button.active {
  background: #ff9800;
}

.video-player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 10px;
  overflow-y: auto;
}

.video-player {
  background: #000;
  border-radius: 8px;
}

.stream-info {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  color: white;
}

.status-badge.online {
  background: #ef4444;
}

.status-badge.offline {
  background: #999;
}

.webcam-info {
  padding: 20px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-weight: bold;
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
}

.description {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}

.error-banner {
  padding: 12px 20px;
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
  border-radius: 4px;
  margin: 10px;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-weight: bold;
}

.map-popup h4 {
  margin-bottom: 5px;
}

.map-popup p {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.popup-button {
  width: 100%;
  padding: 6px;
  margin-top: 8px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.app-footer {
  padding: 15px 20px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  text-align: center;
  font-size: 12px;
  color: #999;
}

/* Responsive */
@media (max-width: 768px) {
  .app-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: 40%;
    border-right: none;
    border-top: 1px solid #e0e0e0;
  }

  .main-content {
    height: 60%;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .webcam-header {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .sidebar {
    height: 50%;
  }

  .main-content {
    height: 50%;
  }

  .header-content h1 {
    font-size: 20px;
  }
}
```

---

## 5. Installation & Verwendung

### 5.1 Mit Docker (Empfohlen)

```bash
# Schritt 1: Repository klonen
git clone https://github.com/user/webcam-viewer.git
cd webcam-viewer

# Schritt 2: Starten
docker-compose up

# Schritt 3: Browser öffnen
# → http://localhost:3000
```

**Fertig!** Keine Konfiguration, keine Login erforderlich.

### 5.2 Mit npm (Lokal entwickeln)

```bash
# Schritt 1: Dependencies installieren
npm install

# Schritt 2: Datenbank initialisieren
npm run init-db

# Schritt 3: Starten (Development)
npm run dev

# Oder Production
npm run build
npm start
```

### 5.3 Netzwerk-Zugriff

```bash
# Auf dem Server-Rechner (z.B. Docker Host IP 192.168.1.100):

# Von anderem Gerät im Netzwerk:
http://192.168.1.100:3000
```

Oder mit **hostname**:
```bash
# Server: ./server/index.js
# Listen auf 0.0.0.0:3000

# Anderes Gerät:
http://webcam-server.local:3000   # Falls Bonjour/mDNS aktiviert
```

---

## 6. Datenmanagement

### 6.1 Favoriten & History

**Lokal im Browser** (empfohlen):
```javascript
// localStorage für Favoriten
localStorage.setItem(`favorite:webcam_123`, 'true');
localStorage.setItem(`favorite:webcam_456`, 'false');

// Oder IndexedDB für mehr Daten
```

**Optional: Server-seitig**:
```javascript
// POST /api/favorites
{
  webcamId: "webcam_123"
}
```

### 6.2 Datenbank-Backup

```bash
# Automatisches Backup (täglich)
sqlite3 /app/data/webcams.db ".dump" > /app/data/backups/webcams_$(date +%Y%m%d).sql

# Oder: Docker Volume sichern
docker cp webcam-viewer-webcam-viewer-1:/app/data/webcams.db ./backup/
```

### 6.3 Webcam-Daten importieren/exportieren

**CSV-Import:**
```csv
id,name,city,country,latitude,longitude,stream_url,stream_type,category
de-custom-001,Custom Cam,Berlin,Deutschland,52.52,13.40,http://example.com,http,city
```

**HTTP-Endpoint:**
```bash
curl -X POST http://localhost:3000/api/import \
  -F "file=@webcams.csv"
```

---

## 7. Features & Use Cases

### 7.1 Vollständig lokal

✅ **Alle Daten lokal gespeichert**
```
~/.docker/volumes/
  webcam-viewer_data/
    _data/
      webcams.db
      thumbnails/
      backups/
```

✅ **Kein Internet erforderlich** (außer für Live-Streams)
✅ **Sofort nutzbar** - keine Registrierung
✅ **Beliebig erweiterbar** - Webcams hinzufügen

### 7.2 Netzwerk-Sharing

Die App läuft auf Port 3000 und ist im **gesamten Netzwerk zugänglich**:

```
Hauptrechner:   192.168.1.100:3000
Tablet:         http://192.168.1.100:3000  ← Gleiche App
Handy:          http://192.168.1.100:3000  ← Gleiche Daten
```

Jedes Gerät hat aber **eigene Favoriten** (localStorage ist gerätegebunden).

### 7.3 Webcams hinzufügen

**Admin-Panel** (optional später):
```javascript
POST /api/admin/webcams
{
  "name": "Meine Custom Webcam",
  "stream_url": "http://example.com/stream",
  "city": "Berlin",
  "country": "Deutschland",
  "latitude": 52.52,
  "longitude": 13.40
}
```

Oder **CSV-Import via Web-UI**:
- Datei → Import Webcams → CSV hochladen

---

## 8. Technische Stack-Zusammenfassung

```
Frontend (React):
├── Leaflet.js (Karte)
├── HLS.js (Video)
├── Tailwind CSS (Styling)
└── localStorage (Favoriten)

Backend (Node.js):
├── Express (HTTP Server)
├── SQLite3 (Datenbank)
└── Compression (gzip)

Deployment:
├── Docker (Container)
├── docker-compose (Orchestrierung)
└── Single Port (3000)
```

---

## 9. Sicherheit & Datenschutz

### 9.1 Keine Authentifizierung
✅ **Öffentlicher Zugriff** - aber auf lokalem Netzwerk
✅ **Keine Benutzer-Daten** - nur Webcams und Favoriten

### 9.2 Datenschutz
✅ **Alle Daten lokal** - kein Hochladen auf externe Server
✅ **Keine Tracking/Telemetrie**
✅ **Keine IP-Logging**

### 9.3 Optionale Zugriffskontrolle (später)
```javascript
// Optional: Basic Auth
const auth = require('basic-auth');

app.use((req, res, next) => {
  const credentials = auth(req);
  if (credentials?.pass !== process.env.PASSWORD) {
    return res.status(401).send('Unauthorized');
  }
  next();
});
```

---

## 10. Roadmap (4 Wochen MVP)

### Woche 1: Backend + DB
- ✅ Node.js/Express Setup
- ✅ SQLite Schema
- ✅ Sample-Daten
- ✅ REST API Grundgerüst

### Woche 2: Frontend Basics
- ✅ React SPA
- ✅ Leaflet Karte
- ✅ Webcam-Liste
- ✅ Suche & Filter

### Woche 3: Features
- ✅ Video-Player
- ✅ Favoriten (localStorage)
- ✅ Responsive Design
- ✅ Error Handling

### Woche 4: Polish & Deployment
- ✅ Docker Setup
- ✅ Styling refinement
- ✅ Testing
- ✅ Documentation

**Ergebnis:** App läuft sofort, kein Setup nötig!

---

## 11. Dateien-Struktur

```
webcam-viewer/
├── server/
│   ├── index.js              # Express Server
│   ├── schema.sql            # DB Schema
│   └── middleware/           # Auth, etc (später)
│
├── src/
│   ├── App.jsx              # Main Component
│   ├── App.css
│   ├── components/
│   │   ├── MapComponent.jsx
│   │   ├── VideoPlayer.jsx
│   │   ├── SearchBar.jsx
│   │   ├── WebcamList.jsx
│   │   └── Sidebar.jsx
│   ├── hooks/
│   │   └── useWebcams.js
│   └── index.js
│
├── public/
│   └── index.html
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .gitignore
└── README.md
```

---

## 12. package.json

```json
{
  "name": "webcam-viewer",
  "version": "1.0.0",
  "description": "Lokale Web-App für Webcam-Verwaltung",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "concurrently \"react-scripts start\" \"node server/index.js\"",
    "build": "react-scripts build",
    "init-db": "sqlite3 data/webcams.db < server/schema.sql",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "dependencies": {
    "express": "^4.18.0",
    "sqlite3": "^5.1.6",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "leaflet": "^1.9.0",
    "leaflet.markercluster": "^1.5.0",
    "hls.js": "^1.4.0",
    "axios": "^1.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "react-scripts": "5.0.0",
    "concurrently": "^8.0.0"
  }
}
```

---

## 13. Quick-Start Commands

```bash
# Schnellstart mit Docker
git clone <repo>
cd webcam-viewer
docker-compose up

# Browser öffnen
# → http://localhost:3000

# ✅ Fertig! Keine weitere Konfiguration
```

---

## 14. Zusammenfassung

| Aspekt | Details |
|--------|---------|
| **Typ** | Website (React SPA) |
| **Server** | Node.js/Express (localhost:3000) |
| **Datenbank** | SQLite (lokal in Docker) |
| **Login** | ❌ Nicht erforderlich |
| **Zugriff** | http://localhost:3000 oder LAN-IP |
| **Daten** | 100% lokal gespeichert |
| **Offline** | Funktioniert (außer Live-Streams) |
| **Deployment** | Docker oder npm |
| **Setup-Zeit** | <5 Minuten |
| **Wartung** | Minimal (SQLite) |

---

**Dokumentversion:** 3.0 (Web-basiert, Lokal, Kein Login)  
**Zuletzt aktualisiert:** 2026-06-25