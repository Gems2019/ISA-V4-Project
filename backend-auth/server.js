const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// Configure CORS
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:8000',
];
if (process.env.CORS_ORIGINS) {
  const additionalOrigins = process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(o => o);
  corsOrigins.push(...additionalOrigins);
}

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// MySQL connection configuration
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

let adminPool;
let clientPool;

// Initialize admin connection pool
async function createAdminPool() {
  adminPool = mysql.createPool(adminDbConfig);
  await waitForConnection(adminPool);
  console.log('✅ Connected as admin');
}

// Initialize client connection pool
async function createClientPool() {
  clientPool = mysql.createPool(clientDbConfig);
  await waitForConnection(clientPool);
  console.log(`✅ Connected as ${clientDbConfig.user}`);
}

// Helper: wait for a pool to accept connections with retries
async function waitForConnection(pool, attempts = 10, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

// Helper function to execute queries using admin pool
async function adminQuery(sql, params = []) {
  const [results] = await adminPool.execute(sql, params);
  return results;
}

// Helper function to execute queries using client pool (for API endpoints)
async function query(sql, params = []) {
  const [results] = await clientPool.execute(sql, params);
  return results;
}

// Initialize DB: create tables and seed users
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

  await adminQuery(createTableSql);

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
    }
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
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

// Register endpoint
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
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Login endpoint
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

    res.json({ success: true, role: row.user_type, api_token: row.api_token_uses });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

// Get all users endpoint
app.get('/admin/all-users', async (req, res) => {
  try {
    const users = await query('SELECT email, user_type, api_token_uses FROM users', []);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Get all users error', err);
    res.status(500).json({ success: false, message: 'Database error.' });
  }
});

const PORT = process.env.PORT || 8000;

// Initialize DB then start server
async function startServer() {
  console.log('\n=== Backend Auth Service Starting ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`CORS Origins: ${corsOrigins.join(', ')}`);
  
  try {
    console.log('\nConnecting to database as admin...');
    await createAdminPool();
    
    console.log('Initializing database schema...');
    await initDb();
    
    console.log('Connecting to database as client...');
    await createClientPool();
    
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('\n❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
