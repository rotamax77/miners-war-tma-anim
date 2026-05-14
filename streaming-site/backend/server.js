const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes pour les vidéos
app.get('/api/videos', (req, res) => {
    let query = 'SELECT * FROM videos WHERE is_working = 1';
    const queryParams = [];

    // Filtres
    if (req.query.type) {
        query += ' AND type = ?';
        queryParams.push(req.query.type);
    }
    if (req.query.genre) {
        query += ' AND genre LIKE ?';
        queryParams.push(`%${req.query.genre}%`);
    }
    if (req.query.language) {
        query += ' AND language = ?';
        queryParams.push(req.query.language);
    }

    query += ' ORDER BY date_added DESC';

    db.all(query, queryParams, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

app.get('/api/videos/:id', (req, res) => {
    db.get('SELECT * FROM videos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }
        res.json({
            message: 'success',
            data: row
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
