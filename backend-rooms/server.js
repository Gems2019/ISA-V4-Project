const express = require('express');
const cors = require('cors');
const multer = require('multer');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

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
app.use(cors(corsOptions));

// In-memory storage for rooms
const rooms = new Map();

// Store WebSocket connections per room
const roomConnections = new Map();

// Multer configuration for file uploads
// Expected: 5s clips @ 16kHz, 16-bit. Worst-case stereo: 5 * 16000 * 2 bytes/sample * 2 channels = 320000 bytes.
// Allow some headroom for headers/container/compressed formats. Default to 512KB unless overridden by env.
const MAX_AUDIO_BYTES = process.env.MAX_AUDIO_BYTES ? parseInt(process.env.MAX_AUDIO_BYTES, 10) : 524288; // 512 KiB
console.log(`Using MAX_AUDIO_BYTES=${MAX_AUDIO_BYTES}`);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_AUDIO_BYTES } });
const aiServerEndpoint = process.env.AI_SERVER_ENDPOINT || 'http://localhost:8000/transcribe';

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const roomCode = urlParams.get('room');

  if (roomCode && rooms.has(roomCode)) {
    if (!roomConnections.has(roomCode)) {
      roomConnections.set(roomCode, new Set());
    }
    roomConnections.get(roomCode).add(ws);

    ws.on('close', () => {
      const connections = roomConnections.get(roomCode);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          roomConnections.delete(roomCode);
        }
      }
    });
  } else {
    ws.close();
  }
});

// Broadcast transcription to all clients in a room
function broadcastToRoom(roomCode, data) {
  const connections = roomConnections.get(roomCode);
  if (connections) {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}

// Create room endpoint
app.get('/create-room', (req, res) => {
  const roomCode = generateRoomCode();
  rooms.set(roomCode, {
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
app.get('/join-room', (req, res) => {
  const roomCode = req.query.room;

  if (!roomCode || !rooms.has(roomCode)) {
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
app.post('/process-audio', upload.single('audio_file'), async (req, res) => {
  const { room } = req.body;

  if (!room || !rooms.has(room)) {
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

    const aiResponse = await axios.post(aiServerEndpoint, formData, {
      headers: formData.getHeaders()
    });

    // Broadcast transcription to all room participants
    broadcastToRoom(room, {
      type: 'transcription',
      text: aiResponse.data.text
    });

    res.status(200).end();
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error handler for multer file-size limit and other errors
app.use((err, req, res, next) => {
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