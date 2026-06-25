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
  const limit = parseInt(req.query.limit) || 200;
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
  const limit = parseInt(req.query.limit) || 200;

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
// Windy API v3 caps at 50 per request, so we paginate internally.
app.get('/api/windy', async (req, res) => {
  try {
    const apiKey = process.env.WINDY_API_KEY;
    const totalLimit = parseInt(req.query.limit) || 1000;
    const startOffset = parseInt(req.query.offset) || 0;
    const WINDY_PAGE_SIZE = 50; // Windy API max per request

    // Check if API key is configured
    if (!apiKey || apiKey === 'your_windy_api_key_here') {
      console.warn('Windy API key not configured. Set WINDY_API_KEY in .env file.');
      return res.status(503).json({ error: 'Windy API key not configured. Please add WINDY_API_KEY to your .env file.' });
    }

    const https = require('https');

    // Helper: fetch a single page from Windy
    function fetchWindyPage(limit, offset) {
      const url = `https://api.windy.com/webcams/api/v3/webcams?limit=${limit}&offset=${offset}&include=location,player,images`;
      return new Promise((resolve, reject) => {
        https.get(url, {
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
                reject(new Error('Failed to parse Windy API response'));
              }
            }
          });
        }).on('error', reject);
      });
    }

    // Build page requests
    const pages = [];
    let remaining = totalLimit;
    let currentOffset = startOffset;
    while (remaining > 0) {
      const pageSize = Math.min(remaining, WINDY_PAGE_SIZE);
      pages.push({ limit: pageSize, offset: currentOffset });
      remaining -= pageSize;
      currentOffset += pageSize;
    }

    // Fetch all pages in parallel
    const results = await Promise.all(pages.map(p => fetchWindyPage(p.limit, p.offset)));

    // Merge webcams from all pages
    let allWebcams = [];
    let total = 0;
    for (const data of results) {
      allWebcams = allWebcams.concat(data.webcams || []);
      total = data.total || total; // total stays the same across pages
    }

    // Map Windy API response to our internal format
    const mappedCameras = allWebcams.map(cam => ({
      id: `windy-${cam.webcamId}`,
      name: cam.title,
      city: cam.location?.city || cam.location?.region || 'Unknown',
      country: cam.location?.country || 'Unknown',
      country_code: cam.location?.country_code || '',
      latitude: cam.location?.latitude || 0,
      longitude: cam.location?.longitude || 0,
      stream_url: cam.player?.live || cam.player?.day,
      stream_type: 'iframe',
      thumbnail_url: cam.images?.current?.thumbnail || cam.images?.daylight?.thumbnail || null,
      is_active: cam.status === 'active' ? 1 : 0,
      category: 'nature',
      source: 'windy',
      view_count: cam.viewCount || 0
    })).filter(cam => cam.stream_url && cam.latitude !== 0);

    res.json({
      success: true,
      webcams: mappedCameras,
      total: total
    });

  } catch (err) {
    console.error('Windy API Error:', err);
    res.status(500).json({ error: `Failed to fetch from Windy API: ${err.message}` });
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
