// src/pages/TeacherLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';
import messages from '../config/messages.json';

interface ApiUsage {
  count: number;
  limit: number;
}

const TeacherLandingPage = () => {
  const { logout } = useAuth();
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ count: 0, limit: 20 });

  // Fetch API usage count when the page loads
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await apiClient.get<ApiUsage>('/api/usage');
        setApiUsage(response.data);
      } catch (error) {
        console.error(messages.teacher.errorFetchUsage, error);
      }
    };
    fetchUsage();
  }, []);

  return (
    <div>
      <h2>{messages.teacher.welcomeTitle}</h2>
      <p>
        {messages.teacher.apiUsageLabel} {apiUsage.count} / {apiUsage.limit}
      </p>
      <p>{messages.teacher.comingSoon}</p>
      <button>{messages.teacher.createRoomButton}</button>
      <button onClick={logout}>{messages.teacher.logoutButton}</button>
    </div>
  );
};

export default TeacherLandingPage;