import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import messages from '../config/messages.json';

interface User {
  email: string;
  user_type: string;
  api_token_uses: number;
}

interface ServerStat {
  method: string;
  endpoint: string;
  request_count: number;
}

const AdminLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<ServerStat[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch all users from backend
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/admin/all-users');
        if (response.data.success) {
          setUsers(response.data.users);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    // Fetch server statistics from backend
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/admin/server-stats');
        if (response.data.success) {
          setStats(response.data.stats);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchUsers();
    fetchStats();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('api_token_uses');
    navigate('/login');
  };

  // Separate users by type
  const teachers = users.filter(u => u.user_type === 'teacher');
  const students = users.filter(u => u.user_type === 'student');

  return (
    <div style={{ padding: '20px' }}>
      <h1>{messages.admin.dashboardTitle}</h1>
      <button onClick={handleLogout}>{messages.admin.logoutButton}</button>

      <h2>{messages.admin.teachersTitle}</h2>
      <table border={1} style={{ marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>{messages.admin.tableHeaderEmail}</th>
            <th>{messages.admin.tableHeaderTokensRemaining}</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(teacher => (
            <tr key={teacher.email}>
              <td>{teacher.email}</td>
              <td>{teacher.api_token_uses}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{messages.admin.studentsTitle}</h2>
      <table border={1}>
        <thead>
          <tr>
            <th>{messages.admin.tableHeaderEmail}</th>
            <th>{messages.admin.tableHeaderTokensRemaining}</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.email}>
              <td>{student.email}</td>
              <td>{student.api_token_uses}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{messages.admin.serverStatsTitle}</h2>
      <table border={1}>
        <thead>
          <tr>
            <th>{messages.admin.tableHeaderMethod}</th>
            <th>{messages.admin.tableHeaderEndpoint}</th>
            <th>{messages.admin.tableHeaderRequests}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, index) => (
            <tr key={index}>
              <td>{stat.method}</td>
              <td>{stat.endpoint}</td>
              <td>{stat.request_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminLandingPage;