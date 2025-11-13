// src/pages/TeacherLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import { useNavigate } from 'react-router-dom';
import messages from '../config/messages.json';
import Config from '../config';

const TeacherLandingPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tokenCount, setTokenCount] = useState<number>(20);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
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

  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    setError('');

    try {
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

      <p>{messages.teacher.comingSoon}</p>

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