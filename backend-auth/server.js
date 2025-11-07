const http = require('http');
const url = require('url');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Configure CORS with specific allowed origins
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:8000',
];
if (process.env.CORS_ORIGINS) {
  const additionalOrigins = process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(o => o);
  corsOrigins.push(...additionalOrigins);
}

// Helper: Check if origin is allowed
function isOriginAllowed(origin) {
  // Allow requests with no origin (like Postman, curl, server-to-server)
  if (!origin) return true;
  
  // Check if origin is in whitelist
  if (corsOrigins.includes(origin)) return true;
  
  // In development (no CORS_ORIGINS set), allow all origins
  if (!process.env.CORS_ORIGINS) return true;
  
  return false;
}

// Helper: Set CORS headers
function setCorsHeaders(res, origin) {
  const allowed = isOriginAllowed(origin);
  
  if (allowed) {
    // If there's an origin, echo it back; otherwise use wildcard
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    } else {
      // No origin header (Postman, curl, etc.)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return allowed;
}

// Helper: Parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper: Send JSON response
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

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
  try {
    adminPool = mysql.createPool(adminDbConfig);
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
async function waitForConnection(pool, attempts = 15, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      console.log(`  Attempt ${i}/${attempts}: Connecting to database...`);
      const conn = await pool.getConnection();
      conn.release();
      console.log(`  ✅ Connection successful!`);
      return;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`  ❌ Attempt ${i}/${attempts} failed: ${msg}`);
      if (i === attempts) {
        console.error(`  💥 All ${attempts} connection attempts exhausted!`);
        console.error(`  Check your Railway MySQL service and environment variables.`);
        throw err;
      }
      console.log(`  ⏳ Waiting ${delayMs/1000}s before retry...`);
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

// Route handlers
const routes = {
  '/health': async (req, res) => {
    try {
      await query('SELECT 1');
      sendJson(res, 200, {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      sendJson(res, 503, {
        status: 'unhealthy',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  '/register': async (req, res) => {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { success: false, message: 'Method not allowed' });
    }

    try {
      const { email, password, user_type } = await parseBody(req);
      
      if (!email || !password || !user_type) {
        return sendJson(res, 400, { success: false, message: 'Missing required fields.' });
      }

      const existing = await query('SELECT email FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return sendJson(res, 409, { success: false, message: 'Email already registered.' });
      }

      const hash = await bcrypt.hash(password, 12);
      await query('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [email, hash, user_type]);
      sendJson(res, 200, { success: true, message: 'Registration successful!' });
    } catch (err) {
      console.error('Register error', err);
      sendJson(res, 500, { success: false, message: 'Database error.' });
    }
  },

  '/login': async (req, res) => {
    if (req.method !== 'POST') {
      return sendJson(res, 405, { success: false, message: 'Method not allowed' });
    }

    try {
      const { email, password } = await parseBody(req);
      
      if (!email || !password) {
        return sendJson(res, 400, { success: false, message: 'Missing email or password.' });
      }

      const rows = await query('SELECT email, user_type, password, api_token_uses FROM users WHERE email = ?', [email]);
      if (rows.length === 0) {
        return sendJson(res, 401, { success: false, message: 'Invalid email or password.' });
      }

      const row = rows[0];
      const match = await bcrypt.compare(password, row.password);
      if (!match) {
        return sendJson(res, 401, { success: false, message: 'Invalid email or password.' });
      }

      sendJson(res, 200, { success: true, role: row.user_type, api_token: row.api_token_uses });
    } catch (err) {
      console.error('Login error', err);
      sendJson(res, 500, { success: false, message: 'Database error.' });
    }
  },

  '/admin/all-users': async (req, res) => {
    if (req.method !== 'GET') {
      return sendJson(res, 405, { success: false, message: 'Method not allowed' });
    }

    try {
      const users = await query('SELECT email, user_type, api_token_uses FROM users', []);
      sendJson(res, 200, { success: true, users });
    } catch (err) {
      console.error('Get all users error', err);
      sendJson(res, 500, { success: false, message: 'Database error.' });
    }
  }
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const origin = req.headers.origin;

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname} - Origin: ${origin || 'none'}`);

  // Set CORS headers
  const allowed = setCorsHeaders(res, origin);
  if (!allowed) {
    console.warn(`❌ CORS BLOCKED - Origin: ${origin || 'none'} | Allowed: ${corsOrigins.join(', ')}`);
    return sendJson(res, 403, { 
      success: false, 
      message: 'CORS policy: Origin not allowed',
      origin: origin,
      allowedOrigins: corsOrigins
    });
  }
  
  if (origin) {
    console.log(`✅ CORS allowed - Origin: ${origin}`);
  } else {
    console.log(`✅ No-origin request allowed (Postman/curl/server)`);
  }

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Route to handler
  const handler = routes[pathname];
  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('Handler error:', err);
      sendJson(res, 500, { success: false, message: 'Internal server error', timestamp: new Date().toISOString() });
    }
  } else {
    sendJson(res, 404, { success: false, message: 'Endpoint not found', path: pathname, method: req.method });
  }
});

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize DB then start server
async function startServer() {
  console.log('\n=== Backend Auth Service Starting ===');
  console.log(`Node version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Host: ${HOST}`);
  console.log('\n--- Database Configuration ---');
  console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost (default)'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || '3306 (default)'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'backend_admin (default)'}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET (using default)'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'auth_db (default)'}`);
  console.log(`CORS_ORIGINS: ${process.env.CORS_ORIGINS || 'NOT SET (development mode)'}`);
  
  try {
    console.log('\n--- Step 1: Creating admin database pool ---');
    await createAdminPool();
    
    console.log('\n--- Step 2: Initializing database schema ---');
    await initDb();
    
    console.log('\n--- Step 3: Creating client database pool ---');
    await createClientPool();
    
    console.log('\n--- Step 4: Starting HTTP server ---');
    server.listen(PORT, HOST, () => {
      console.log(`\n✅ Server successfully started!`);
      console.log(`🚀 User microservice running on http://${HOST}:${PORT}`);
      console.log(`📡 Health check: http://${HOST}:${PORT}/health`);
      console.log(`\n🌐 CORS Configuration:`);
      console.log(`   Mode: ${process.env.CORS_ORIGINS ? 'PRODUCTION (whitelist)' : 'DEVELOPMENT (permissive)'}`);
      console.log(`   Allowed origins: ${corsOrigins.join(', ')}`);
      console.log(`   No-origin requests (Postman/curl): ALLOWED`);
      console.log('\n=== Ready to accept requests ===\n');
    });
  } catch (err) {
    console.error('\n❌ FATAL ERROR - Failed to start server');
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    console.error('\nCommon causes:');
    console.error('1. Database connection refused - check DB_HOST, DB_USER, DB_PASSWORD');
    console.error('2. Database not accessible - verify MySQL service is running');
    console.error('3. Wrong credentials - verify environment variables in Railway');
    console.error('\nExiting...');
    process.exit(1);
  }
}

startServer();
