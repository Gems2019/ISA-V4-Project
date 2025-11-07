const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// Configure CORS with specific allowed origins
const corsOrigins = [
  'http://localhost:5173', // Local Vite dev server
  'http://localhost:8000', // Alternative local dev port
];
if (process.env.CORS_ORIGINS) {
  corsOrigins.push(process.env.CORS_ORIGINS); // Adds frontend endpoint if it is an environment variable
}
const corsOptions = {
  origin: (origin, callback) => {
    // allow non-browser requests like curl or same-origin (no origin)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: Origin not allowed'));
  },
  credentials: true, // Allow cookies and authentication headers
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MySQL connection configuration
// For Railway, set these environment variables in your Railway project

// Admin connection for initialization (CREATE TABLE, seeding)
const adminDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'backend_admin',
  password: process.env.DB_PASSWORD || 'backend_password',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Frontend client connection for runtime API queries
const clientDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_CLIENT_USER || 'frontend_client',
  password: process.env.DB_CLIENT_PASSWORD || '',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection pools
let adminPool;  // Used for initialization only
let clientPool; // Used for runtime API queries

// Initialize admin connection pool
async function createAdminPool() {
  try {
    adminPool = mysql.createPool(adminDbConfig);
    // Wait for connection with retries (handles transient DB startup on hosted platforms)
    await waitForConnection(adminPool);
    console.log('Successfully connected to MySQL database as admin');
    return adminPool;
  } catch (err) {
    console.error('Failed to connect to MySQL database as admin:', err);
    throw err;
  }
}

// Initialize client connection pool
async function createClientPool() {
  try {
    clientPool = mysql.createPool(clientDbConfig);
    await waitForConnection(clientPool);
    console.log(`Successfully connected to MySQL database as ${clientDbConfig.user}`);
    return clientPool;
  } catch (err) {
    console.error('Failed to connect to MySQL database as client:', err);
    throw err;
  }
}

// Helper: wait for a pool to accept connections with retries/backoff
async function waitForConnection(pool, attempts = 8, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`DB connection attempt ${i} failed: ${msg}`);
      if (i === attempts) throw err;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

// Helper function to execute queries using admin pool
async function adminQuery(sql, params = []) {
  try {
    const [results] = await adminPool.execute(sql, params);
    return results;
  } catch (err) {
    console.error('Admin query error:', err);
    throw err;
  }
}

// Helper function to execute queries using client pool (for API endpoints)
async function query(sql, params = []) {
  try {
    const [results] = await clientPool.execute(sql, params);
    return results;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Initialize DB: create tables and seed users if they don't exist
async function initDb() {
  const createTableSql = `
  CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      user_type ENUM('admin', 'teacher', 'student') NOT NULL,
      api_token_uses INT DEFAULT 20,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

  try {
    await adminQuery(createTableSql);
    console.log('Users table ready');

    // Seed default users (only if not present)
    const seeds = [
      { email: 'admin@admin.com', password: '111', user_type: 'admin' },
      { email: 'teacher@teacher.com', password: '123', user_type: 'teacher' },
      { email: 'john@john.com', password: '123', user_type: 'student' },
    ];

    for (const u of seeds) {
      const existing = await adminQuery('SELECT email FROM users WHERE email = ?', [u.email]);
      if (existing.length === 0) {
        const hash = await bcrypt.hash(u.password, 12);
        await adminQuery('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [u.email, hash, u.user_type]);
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
    const existing = await query('SELECT email FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    await query('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [email, hash, user_type]);
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
    const rows = await query('SELECT email, user_type, password, api_token_uses FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const row = rows[0];
    const match = await bcrypt.compare(password, row.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Return role and token count
    res.json({ success: true, role: row.user_type, api_token: row.api_token_uses });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Get all users endpoint (for admin)
app.get('/admin/all-users', async (req, res) => {
  try {
    const users = await query('SELECT email, user_type, api_token_uses FROM users', []);
    
    res.json({ success: true, users });
  } catch (err) {
    console.error('Get all users error', err);
    return res.status(500).json({ success: false, message: 'Database error.' });
  }
});

const PORT = process.env.PORT || 8000;

// Initialize DB then start server
async function startServer() {
  try {
    // First create admin pool and initialize database
    await createAdminPool();
    await initDb();
    
    // Then create client pool for runtime queries
    await createClientPool();
    
    // Start server
    app.listen(PORT, () => console.log(`User microservice running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to initialize, exiting.', err);
    process.exit(1);
  }
}

startServer();
