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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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
      const tokenResponse = await fetch(`${Config.AUTH_BASE_URL}/use-token`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to use email');
      }

      const tokenData = await tokenResponse.json();
      const newTokenCount = tokenData.api_token_uses || 0;
      
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(messages.teacher.confirmDeleteAccount);
    if (!confirmed) return;

    setIsDeletingAccount(true);
    setError('');

    try {
      const email = localStorage.getItem('token');
      if (!email) {
        throw new Error('No email found');
      }

      const response = await fetch(`${Config.AUTH_BASE_URL}/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear local storage and redirect to login
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(messages.teacher.errorDeleteAccount);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div>
      <h2>{messages.teacher.welcomeTitle}</h2>
      
      <h3>{messages.teacher.apiTokenUsageTitle}</h3>
      <table border={1}>
        <thead>
          <tr>
            <th>{messages.teacher.description}</th>
            <th>{messages.teacher.count}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{messages.teacher.initialApiTokens}</td>
            <td>{initialTokens}</td>
          </tr>
          <tr>
            <td>{messages.teacher.tokensUsed}</td>
            <td>{usedTokens}</td>
          </tr>
          <tr>
            <td><strong>{messages.teacher.tokensRemaining}</strong></td>
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
      <button 
        onClick={handleDeleteAccount}
        disabled={isDeletingAccount}
        style={{ backgroundColor: '#d32f2f', color: 'white' }}
      >
        {isDeletingAccount ? messages.teacher.deletingAccount : messages.teacher.deleteAccountButton}
      </button>
    </div>
  );
};

export default TeacherLandingPage;