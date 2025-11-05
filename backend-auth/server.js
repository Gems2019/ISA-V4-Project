const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// Configure CORS with specific allowed origins
const corsOptions = {
  origin: [
    'http://localhost:5173', // Local Vite dev server
  
    'https://salmon-tree-0e98fe510.3.azurestaticapps.net' // Azure Static Web Apps frontend
  ],
  credentials: true, // Allow cookies and authentication headers
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Connect to SQLite DB
const db = new sqlite3.Database('users.db');

// Promisified helpers for sqlite3
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Initialize DB: create tables and seed users if they don't exist
async function initDb() {
  const createTableSql = `
  CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY UNIQUE NOT NULL,
      password TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'teacher', 'student')),
      api_token_uses INTEGER DEFAULT 20
  )`;

  try {
    await dbRun(createTableSql);
    console.log('Users table ready (users.db)');

    // Seed default users (only if not present)
    const seeds = [
      { email: 'admin@admin.com', password: '111', user_type: 'admin' },
      { email: 'teacher@teacher.com', password: '123', user_type: 'teacher' },
      { email: 'john@john.com', password: '123', user_type: 'student' },
    ];

    for (const u of seeds) {
      const existing = await dbGet('SELECT email FROM users WHERE email = ?', [u.email]);
      if (!existing) {
        const hash = await bcrypt.hash(u.password, 12);
        await dbRun('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [u.email, hash, u.user_type]);
        console.log(`Inserted seed user: ${u.email}`);
      }
    }
  } catch (err) {
    console.error('Failed to initialize DB', err);
    throw err;
  }
}

// Sign up endpoint (hashes password before storing)
app.post('/register', async (req, res) => {
  const { email, password, user_type } = req.body;
  if (!email || !password || !user_type) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const existing = await dbGet('SELECT email FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await dbRun('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [email, hash, user_type]);
    res.json({ success: true, message: 'Registration successful!' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Log in endpoint (verifies password hash)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing email or password.' });
  }

  try {
    const row = await dbGet('SELECT email, user_type, password, api_token_uses FROM users WHERE email = ?', [email]);
    if (!row) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, row.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Deduct 1 token on successful login
    const newTokenCount = row.api_token_uses - 1;
    await dbRun('UPDATE users SET api_token_uses = ? WHERE email = ?', [newTokenCount, email]);

    // Return role and updated token count
    res.json({ success: true, role: row.user_type, api_token: newTokenCount });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Get all users endpoint (for admin)
app.get('/admin/all-users', async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT email, user_type, api_token_uses FROM users', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    res.json({ success: true, users });
  } catch (err) {
    console.error('Get all users error', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});

const PORT = process.env.PORT || 8000;

// Initialize DB then start server
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`User microservice running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize DB, exiting.', err);
    process.exit(1);
  });
