import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

interface User {
  email: string;
  user_type: string;
  api_token_uses: number;
}

const AdminLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

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

    fetchUsers();
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
      <h1>Admin Dashboard</h1>
      <button onClick={handleLogout}>Logout</button>

      <h2>Teachers</h2>
      <table border={1} style={{ marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>Email</th>

            <th>Tokens Remaining</th>
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

      <h2>Students</h2>
      <table border={1}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Tokens Remaining</th>
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
    </div>
  );
};

export default AdminLandingPage;