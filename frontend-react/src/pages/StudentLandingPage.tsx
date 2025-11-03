// src/pages/StudentLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import messages from '../config/messages.json';

const StudentLandingPage = () => {
  const { logout } = useAuth();
  const [tokenCount, setTokenCount] = useState<number>(20);
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

      <button>{messages.student.joinRoomButton}</button>
      <button onClick={logout}>{messages.student.logoutButton}</button>
    </div>
  );
};

export default StudentLandingPage;