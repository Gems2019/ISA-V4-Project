// src/pages/StudentLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import { useNavigate } from 'react-router-dom';
import messages from '../config/messages.json';
import Config from '../config';

const StudentLandingPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tokenCount, setTokenCount] = useState<number>(20);
  const [roomCode, setRoomCode] = useState<string>('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState<string>('');
  const initialTokens = 20;

  // Deduct 1 token when landing page loads (frontend only)
  useEffect(() => {
    const storedTokens = localStorage.getItem('api_token_uses');
    if (storedTokens) {
      const currentTokens = parseInt(storedTokens);
      // Deduct 1 token for accessing landing page
      const newTokenCount = Math.max(0, currentTokens - 1);
      setTokenCount(newTokenCount);
      localStorage.setItem('api_token_uses', newTokenCount.toString());
    } else {
      // First time, set to 19 (20 - 1 for landing page access)
      setTokenCount(19);
      localStorage.setItem('api_token_uses', '19');
    }
  }, []);

  const usedTokens = initialTokens - tokenCount;

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      const response = await fetch(`${Config.ROOMS_BASE_URL}/join-room?room=${roomCode.trim()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Room not found');
      }

      const data = await response.json();
      const wsUrl = data.ws_url;
      
      // Navigate to student room page with WebSocket URL
      navigate(`/student/room/${data.room_code}`, { state: { wsUrl } });
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room. Please check the room code and try again.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div>
      <h2>{messages.student.welcomeTitle}</h2>
      
      <h3>API Token Usage</h3>
      <table border={1}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Initial API Tokens</td>
            <td>{initialTokens}</td>
          </tr>
          <tr>
            <td>Tokens Used</td>
            <td>{usedTokens}</td>
          </tr>
          <tr>
            <td><strong>Tokens Remaining</strong></td>
            <td><strong>{tokenCount}</strong></td>
          </tr>
        </tbody>
      </table>

      <p>{messages.student.comingSoon}</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Enter room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          style={{ 
            padding: '8px', 
            marginRight: '10px',
            fontSize: '14px',
            textTransform: 'uppercase'
          }}
        />
        <button 
          onClick={handleJoinRoom}
          disabled={isJoiningRoom || !roomCode.trim()}
        >
          {isJoiningRoom ? 'Joining...' : messages.student.joinRoomButton}
        </button>
      </div>

      <button onClick={logout}>{messages.student.logoutButton}</button>
    </div>
  );
};

export default StudentLandingPage;