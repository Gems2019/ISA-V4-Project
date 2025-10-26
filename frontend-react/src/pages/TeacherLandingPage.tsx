// src/pages/TeacherLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';

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
        console.error('Failed to fetch API usage', error);
      }
    };
    fetchUsage();
  }, []);

  return (
    <div>
      <h2>Welcome, Teacher!</h2>
      <p>
        API Calls Used: {apiUsage.count} / {apiUsage.limit}
      </p>
      <p>Teacher Dashboard - Coming Soon</p>
    <button onClick={logout}>Create Room</button>

      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default TeacherLandingPage;