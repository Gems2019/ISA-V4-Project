// src/pages/StudentLandingPage.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import { useNavigate } from 'react-router-dom';
import messages from '../config/messages.json';
import Config from '../config';

const StudentLandingPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initialTokens = 20;
  const [tokenCount, setTokenCount] = useState<number>(() => {
    const stored = localStorage.getItem('api_token_uses');
    return stored ? parseInt(stored, 10) : initialTokens;
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState<string>('');

  const usedTokens = initialTokens - tokenCount;

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError(messages.student.errorEnterRoomCode);
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      // Get email from localStorage
      const email = localStorage.getItem('token');
      if (!email) {
        throw new Error('No token found');
      }

      // Query the use_token endpoint
      const tokenResponse = await fetch(`${Config.AUTH_BASE_URL}/use-token?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to use email');
      }

      const tokenData = await tokenResponse.json();
      const newTokenCount = tokenData.remaining_tokens || 0;
      
      // Update localStorage with new token count
      localStorage.setItem('api_token_uses', newTokenCount.toString());
      setTokenCount(newTokenCount);

      // Join room
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
      setError(messages.student.errorJoinRoom);
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

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder={messages.student.roomCodePlaceholder}
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
          {isJoiningRoom ? messages.student.joiningText : messages.student.joinRoomButton}
        </button>
      </div>

      <button onClick={logout}>{messages.student.logoutButton}</button>
    </div>
  );
};

export default StudentLandingPage;