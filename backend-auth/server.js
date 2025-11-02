const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow cross-origin requests from frontend

// Connect to SQLite DB
const db = new sqlite3.Database('users.db');

// Sign up endpoint
app.post('/register', (req, res) => {
  const { email, password, user_type } = req.body;
  if (!email || !password || !user_type) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (row) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const api_token = crypto.randomBytes(32).toString('hex');
    db.run(
      'INSERT INTO users (email, password, user_type, api_token) VALUES (?, ?, ?, ?)',
      [email, password, user_type, api_token],
      (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error.' });
        res.json({ success: true, message: 'Registration successful!', api_token });
      }
    );
  });
});

// Log in endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing email or password.' });
  }
  db.get('SELECT email, user_type, api_token FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error.' });
    if (!row) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Return role and token
    res.json({ success: true, role: row.user_type, api_token: row.api_token });
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`User microservice running on http://localhost:${PORT}`));
