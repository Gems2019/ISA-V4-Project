// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Authentication API',
      version: '1.0.0',
      description: 'Authentication microservice with user registration, login, and user management capabilities',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            user_type: {
              type: 'string',
              enum: ['admin', 'teacher', 'student'],
              description: 'Type of user account',
              example: 'student',
            },
            api_token_uses: {
              type: 'integer',
              description: 'Number of API token uses remaining',
              example: 20,
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'user_type'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'newuser@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'securePassword123',
            },
            user_type: {
              type: 'string',
              enum: ['admin', 'teacher', 'student'],
              description: 'Type of user account to create',
              example: 'student',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@john.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: '123',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the operation was successful',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Descriptive message about the operation result',
              example: 'Operation completed successfully',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if login was successful',
              example: true,
            },
            role: {
              type: 'string',
              enum: ['admin', 'teacher', 'student'],
              description: 'User role/type',
              example: 'student',
            },
            api_token: {
              type: 'integer',
              description: 'Number of API token uses remaining',
              example: 20,
            },
          },
        },
        UsersResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the operation was successful',
              example: true,
            },
            users: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
              description: 'List of all users in the system',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates operation failure',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message describing what went wrong',
              example: 'An error occurred',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Overall health status',
              example: 'healthy',
            },
            database: {
              type: 'string',
              description: 'Database connection status',
              example: 'connected',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the health check',
              example: '2025-11-17T12:00:00.000Z',
            },
          },
        },
      },
    },
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger documentation endpoint
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Checks the health status of the API server and database connection
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy and database is connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: healthy
 *               database: connected
 *               timestamp: '2025-11-17T12:00:00.000Z'
 *       503:
 *         description: Service is unhealthy or database is disconnected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 database:
 *                   type: string
 *                   example: disconnected
 *                 error:
 *                   type: string
 *                   example: Connection refused
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
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

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email, password, and user type
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: newuser@example.com
 *             password: securePassword123
 *             user_type: student
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Registration successful!
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Missing required fields.
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Email already registered.
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Database error.
 */
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user with email and password, returns user role and API token usage
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: john@john.com
 *             password: '123'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               success: true
 *               role: student
 *               api_token: 20
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Missing email or password.
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid email or password.
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Database error.
 */
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

/**
 * @swagger
 * /admin/all-users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all registered users in the system (admin endpoint)
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: List of all users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersResponse'
 *             example:
 *               success: true
 *               users:
 *                 - email: admin@admin.com
 *                   user_type: admin
 *                   api_token_uses: 20
 *                 - email: teacher@teacher.com
 *                   user_type: teacher
 *                   api_token_uses: 20
 *                 - email: john@john.com
 *                   user_type: student
 *                   api_token_uses: 20
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Database error.
 */
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

/**
 * @swagger
 * /use-token:
 *   put:
 *     summary: Decrement API token for a user
 *     description: Decrements api_token_uses for the given user and returns the new count
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@john.com
 *     responses:
 *       200:
 *         description: Token decremented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 api_token_uses:
 *                   type: integer
 *       400:
 *         description: Missing email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
app.put('/use-token', async (req, res) => {
  const { email } = req.body;
  
  // If the email cannot be found...
  if (!email) {
    return res.status(400).json({ success: false, message: 'Missing email.' });
  }

  try {
    // Get current token count
    console.log('Reached the /use-token area')
    const rows = await query('SELECT api_token_uses FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    let currentTokens = rows[0].api_token_uses;

    // if the tokens is less than or equal to 0, return the token count set to 0 and dont decrement further. 
    if (currentTokens <= 0) {
      return res.json({ success: true, api_token_uses: 0 });
    }

    // Decrement and update
    const newTokens = currentTokens - 1;
    await query('UPDATE users SET api_token_uses = ? WHERE email = ?', [newTokens, email]);
    console.log(newTokens)
    return res.json({ success: true, api_token_uses: newTokens });
  } catch (err) {
    console.error('Use token error', err);
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
