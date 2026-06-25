const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs').promises;
require('dotenv').config();

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
    // Verzeichnis sicherstellen
    const dbDir = path.dirname(DB_PATH);
    fs.mkdir(dbDir, { recursive: true }).then(() => {
      db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) reject(err);
        else {
          // Schema prüfen & erstellen wenn nötig
          const schemaPath = path.join(__dirname, 'schema.sql');
          fs.readFile(schemaPath, 'utf8').then((schema) => {
            db.exec(schema, (err) => {
              if (err) reject(err);
              else resolve();
            });
          }).catch(reject);
        }
      });
    }).catch(reject);
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

// GET /api/windy - Windy Webcams proxy endpoint
app.get('/api/windy', async (req, res) => {
  try {
    const apiKey = process.env.WINDY_API_KEY;

    // Check if API key is configured
    if (!apiKey || apiKey === 'your_windy_api_key_here') {
      console.warn("Windy API key not configured. Returning mock data.");
      // Return mock Windy data so the frontend has something to display
      return res.json({
        success: true,
        webcams: [
          {
            id: 'windy-chicago',
            name: 'Windy: Chicago Skyline',
            city: 'Chicago',
            country: 'USA',
            latitude: 41.8781,
            longitude: -87.6298,
            stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // Mock HLS
            stream_type: 'hls',
            category: 'city',
            source: 'windy'
          },
          {
            id: 'windy-london',
            name: 'Windy: London Bridge',
            city: 'London',
            country: 'UK',
            latitude: 51.5072,
            longitude: -0.1276,
            stream_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
            stream_type: 'hls',
            category: 'city',
            source: 'windy'
          }
        ]
      });
    }

    // Actual Windy API Fetch Logic using native https module
    const https = require('https');
    
    const data = await new Promise((resolve, reject) => {
      https.get('https://api.windy.com/webcams/api/v3/webcams?limit=30&include=location,player', {
        headers: { 'x-windy-api-key': apiKey }
      }, (resp) => {
        let responseData = '';
        resp.on('data', (chunk) => { responseData += chunk; });
        resp.on('end', () => {
          if (resp.statusCode !== 200) {
            reject(new Error(`Windy API responded with status ${resp.statusCode}: ${responseData}`));
          } else {
            try {
              resolve(JSON.parse(responseData));
            } catch (e) {
              reject(new Error("Failed to parse Windy API response"));
            }
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
    
    // Map Windy data to our internal format
    const mappedCameras = data.webcams.map(cam => ({
      id: `windy-${cam.webcamId}`,
      name: cam.title,
      city: cam.location?.city || 'Unknown',
      country: cam.location?.country || 'Unknown',
      latitude: cam.location?.latitude || 0,
      longitude: cam.location?.longitude || 0,
      // Windy typically returns a player URL (iframe embed) or a direct stream URL
      // We will default to stream if available, otherwise player embed
      stream_url: cam.player?.live?.available ? cam.player.live.embed : cam.player?.day?.embed,
      stream_type: 'iframe', // We set to iframe since Windy player links are usually iframe embeds
      category: 'other',
      source: 'windy'
    })).filter(cam => cam.stream_url); // Only include webcams that have a playable URL

    res.json({ success: true, webcams: mappedCameras });

  } catch (err) {
    console.error('Windy API Error:', err);
    res.status(500).json({ error: 'Failed to fetch from Windy API' });
  }
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
