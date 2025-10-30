// src/pages/StudentLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';
import messages from '../config/messages.json';

interface ApiUsage {
  count: number;
  limit: number;
}

const StudentLandingPage = () => {
  const { logout } = useAuth();
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ count: 0, limit: 20 });

  // Fetch API usage count when the page loads
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await apiClient.get<ApiUsage>('/api/usage');
        setApiUsage(response.data);
      } catch (error) {
        console.error(messages.student.errorFetchUsage, error);
      }
    };
    fetchUsage();
  }, []);

  return (
    <div>
      <h2>{messages.student.welcomeTitle}</h2>
      <p>
        {messages.student.apiUsageLabel} {apiUsage.count} / {apiUsage.limit}
      </p>
      <p>{messages.student.comingSoon}</p>

      <button>{messages.student.joinRoomButton}</button>
      <button onClick={logout}>{messages.student.logoutButton}</button>
    </div>
  );
};

export default StudentLandingPage;