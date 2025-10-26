// src/pages/AdminLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';

interface UserUsage {
  id: number;
  email: string;
  call_count: number;
}

const AdminLandingPage = () => {
  const { logout } = useAuth();
  const [users, setUsers] = useState<UserUsage[]>([]);

  useEffect(() => {
    const fetchAllUsage = async () => {
      try {
        // This endpoint should be admin-only!
        const response = await apiClient.get<UserUsage[]>('/admin/all-usage');
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch all user usage', error);
      }
    };
    fetchAllUsage();
  }, []);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <h3>API Consumption Monitor</h3>
      <table>
        <thead>
          <tr>
            <th>User Email</th>
            <th>API Calls Made</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.call_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default AdminLandingPage;