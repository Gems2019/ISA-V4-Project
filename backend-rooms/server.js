const express = require('express');
const cors = require('cors');
const multer = require('multer');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');

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