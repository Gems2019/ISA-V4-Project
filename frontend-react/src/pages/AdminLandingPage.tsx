import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';
import messages from '../config/messages.json';

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
        console.error(messages.admin.errorFetchUsers, error);
      }
    };
    fetchAllUsage();
  }, []);

  return (
    <div>
      <h2>{messages.admin.dashboardTitle}</h2>
      <h3>{messages.admin.monitorSubtitle}</h3>
      <table>
        <thead>
          <tr>
            <th>{messages.admin.tableHeaderEmail}</th>
            <th>{messages.admin.tableHeaderCalls}</th>
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
      <button onClick={logout}>{messages.admin.logoutButton}</button>
    </div>
  );
};

export default AdminLandingPage;