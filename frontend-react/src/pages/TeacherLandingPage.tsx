// src/pages/TeacherLandingPage.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import { useNavigate } from 'react-router-dom';
import messages from '../config/messages.json';
import Config from '../config';

const TeacherLandingPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initialTokens = 20;
  const [tokenCount, setTokenCount] = useState<number>(() => {
    const stored = localStorage.getItem('api_token_uses');
    return stored ? parseInt(stored, 10) : initialTokens;
  });
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState<string>('');

  const usedTokens = initialTokens - tokenCount;

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
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

      // Create room
      const response = await fetch(`${Config.ROOMS_BASE_URL}/create-room`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      const roomCode = data.room_code;
      const wsUrl = data.ws_url;

      // Navigate to teacher room page with WebSocket URL
      navigate(`/teacher/room/${roomCode}`, { state: { wsUrl } });
    } catch (err) {
      console.error('Error creating room:', err);
      setError(messages.teacher.errorCreateRoom);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <div>
      <h2>{messages.teacher.welcomeTitle}</h2>
      
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

      <button 
        onClick={handleCreateRoom}
        disabled={isCreatingRoom}
      >
        {isCreatingRoom ? messages.teacher.creatingRoomText : messages.teacher.createRoomButton}
      </button>
      <button onClick={logout}>{messages.teacher.logoutButton}</button>
    </div>
  );
};

export default TeacherLandingPage;