const express = require('express');
const cors = require('cors');
const multer = require('multer');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

class RoomServer {
  constructor() {
    this.ENDPOINT = '/API/v1';

    // Initialize Express app and HTTP server
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    // In-memory storage for rooms
    this.rooms = new Map();

    // Store WebSocket connections per room
    this.roomConnections = new Map();

    // Multer configuration for file uploads
    // Expected: 5s clips @ 16kHz, 16-bit. Worst-case stereo: 5 * 16000 * 2 bytes/sample * 2 channels = 320000 bytes.
    // Allow some headroom for headers/container/compressed formats. Default to 512KB unless overridden by env.
    this.MAX_AUDIO_BYTES = process.env.MAX_AUDIO_BYTES ? parseInt(process.env.MAX_AUDIO_BYTES, 10) : 524288; // 512 KiB
    console.log(`Using MAX_AUDIO_BYTES=${this.MAX_AUDIO_BYTES}`);
    this.upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: this.MAX_AUDIO_BYTES } });
    this.aiServerEndpoint = process.env.AI_SERVER_ENDPOINT || 'http://localhost:8080/transcribe';

    // Configure middleware
    this.setupMiddleware();

    // Setup Swagger documentation
    this.setupSwagger();

    // Setup WebSocket handler
    this.setupWebSocket();

    // Setup routes
    this.setupRoutes();

    // Setup error handlers
    this.setupErrorHandlers();
  }

  setupMiddleware() {
    this.app.use(express.json());

    const corsOrigins = [
      'http://localhost:5173',
      'http://localhost:8000'
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
    this.app.use(cors(corsOptions));
  }

  setupSwagger() {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Room Management API',
          version: '1.0.0',
          description: 'Room management microservice with WebSocket support for real-time communication and audio processing',
          contact: {
            name: 'API Support',
          },
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
        components: {
          schemas: {
            CreateRoomResponse: {
              type: 'object',
              properties: {
                room_code: {
                  type: 'string',
                  description: 'Unique room code for joining the room',
                  example: 'A1B2C3',
                },
                ws_url: {
                  type: 'string',
                  description: 'WebSocket URL for connecting to the room',
                  example: 'ws://localhost:3000?room=A1B2C3',
                },
              },
            },
            JoinRoomResponse: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  description: 'Status of the join operation',
                  example: 'success',
                },
                room_code: {
                  type: 'string',
                  description: 'The room code that was joined',
                  example: 'A1B2C3',
                },
                ws_url: {
                  type: 'string',
                  description: 'WebSocket URL for connecting to the room',
                  example: 'ws://localhost:3000?room=A1B2C3',
                },
              },
            },
            ErrorResponse: {
              type: 'object',
              properties: {
                error: {
                  type: 'string',
                  description: 'Error message describing what went wrong',
                  example: 'Room not found',
                },
              },
            },
            WebSocketMessage: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Type of WebSocket message',
                  example: 'transcription',
                },
                text: {
                  type: 'string',
                  description: 'Transcribed text from audio',
                  example: 'Hello, this is a test transcription.',
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
    this.app.use(`${this.ENDPOINT}/doc`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  setupWebSocket() {
    // WebSocket connection handler
    this.wss.on('connection', (ws, req) => {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const roomCode = urlParams.get('room');

      if (roomCode && this.rooms.has(roomCode)) {
        if (!this.roomConnections.has(roomCode)) {
          this.roomConnections.set(roomCode, new Set());
        }
        this.roomConnections.get(roomCode).add(ws);

        ws.on('close', () => {
          const connections = this.roomConnections.get(roomCode);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              this.roomConnections.delete(roomCode);
            }
          }
        });
      } else {
        ws.close();
      }
    });
  }

  setupRoutes() {
    /**
     * @swagger
     * /API/v1/create-room:
     *   get:
     *     summary: Create a new room
     *     description: Creates a new room with a unique room code and returns the WebSocket URL for real-time communication
     *     tags:
     *       - Rooms
     *     responses:
     *       200:
     *         description: Room created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CreateRoomResponse'
     *             example:
     *               room_code: A1B2C3
     *               ws_url: ws://localhost:3000?room=A1B2C3
     */
    // Create room endpoint
    this.app.get(`${this.ENDPOINT}/create-room`, (req, res) => {
      const roomCode = this.generateRoomCode();
      this.rooms.set(roomCode, {
        createdAt: new Date(),
        participants: []
      });

      // Determine WebSocket protocol based on request
      const wsProtocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const host = req.get('host');
      const wsUrl = `${wsProtocol}://${host}?room=${roomCode}`;

      res.json({ 
        room_code: roomCode,
        ws_url: wsUrl
      });
    });

    /**
     * @swagger
     * /API/v1/join-room:
     *   get:
     *     summary: Join an existing room
     *     description: Allows a user to join an existing room using a room code, returns the WebSocket URL for connecting
     *     tags:
     *       - Rooms
     *     parameters:
     *       - in: query
     *         name: room
     *         required: true
     *         schema:
     *           type: string
     *           example: A1B2C3
     *         description: The room code to join
     *     responses:
     *       200:
     *         description: Successfully joined the room
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/JoinRoomResponse'
     *             example:
     *               status: success
     *               room_code: A1B2C3
     *               ws_url: ws://localhost:3000?room=A1B2C3
     *       404:
     *         description: Room not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: Room not found
     */
    // Join room endpoint
    this.app.get(`${this.ENDPOINT}/join-room`, (req, res) => {
      const roomCode = req.query.room;

      if (!roomCode || !this.rooms.has(roomCode)) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Determine WebSocket protocol based on request
      const wsProtocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const host = req.get('host');
      const wsUrl = `${wsProtocol}://${host}?room=${roomCode}`;

      res.json({ 
        status: 'success',
        room_code: roomCode,
        ws_url: wsUrl
      });
    });

    /**
     * @swagger
     * /API/v1/process-audio:
     *   post:
     *     summary: Process audio file and get transcription
     *     description: Accepts an audio file, forwards it to the AI server for transcription, and broadcasts the result to all room participants via WebSocket
     *     tags:
     *       - Audio Processing
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             required:
     *               - room
     *               - audio_file
     *             properties:
     *               room:
     *                 type: string
     *                 description: The room code where the transcription will be broadcast
     *                 example: A1B2C3
     *               audio_file:
     *                 type: string
     *                 format: binary
     *                 description: Audio file to transcribe (max 512KB by default, 5-second clips recommended)
     *           example:
     *             room: A1B2C3
     *     responses:
     *       200:
     *         description: Audio processed successfully, transcription broadcast to room
     *       400:
     *         description: No audio file provided
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: No audio file provided
     *       404:
     *         description: Room not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: Room not found
     *       413:
     *         description: Audio file too large
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: Audio file too large
     *       500:
     *         description: Failed to process audio
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               error: Failed to process audio
     */
    // Process audio endpoint
    this.app.post(`${this.ENDPOINT}/process-audio`, this.upload.single('audio_file'), async (req, res) => {
      const { room } = req.body;

      if (!room || !this.rooms.has(room)) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      try {
        // Forward audio to AI server
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype
        });

        const aiResponse = await axios.post(this.aiServerEndpoint, formData, {
          headers: formData.getHeaders()
        });

        // Broadcast transcription to all room participants
        this.broadcastToRoom(room, {
          type: 'transcription',
          text: aiResponse.data.text
        });

        res.status(200).end();
      } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).json({ error: 'Failed to process audio' });
      }
    });
  }

  setupErrorHandlers() {
    // Error handler for multer file-size limit and other errors
    this.app.use((err, req, res, next) => {
      if (err) {
        // Multer uses code 'LIMIT_FILE_SIZE' for file too large
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'Audio file too large' });
        }
        console.error('Unhandled error in express:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      next();
    });
  }

  // Generate random room code
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Broadcast transcription to all clients in a room
  broadcastToRoom(roomCode, data) {
    const connections = this.roomConnections.get(roomCode);
    if (connections) {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });
    }
  }

  start(port = 3000) {
    const PORT = process.env.PORT || port;
    this.server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Create and start the server
const roomServer = new RoomServer();
roomServer.start();