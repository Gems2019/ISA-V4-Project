// src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';
import { jwtDecode } from 'jwt-decode'; // You'll need to run: npm install jwt-decode

// Define the shape of your decoded token
interface DecodedToken {
  role: 'student' | 'teacher' | 'admin';
  iat: number;
  exp: number;
}

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth(); // Get the login function from our "Auth Bubble"
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post<{ token: string }>('/login', {
        email,
        password,
      });
      
      const { token } = response.data;
      
      // Decode the token to find the user's role
      const decodedToken = jwtDecode<DecodedToken>(token);
      const role = decodedToken.role;
      
      // Call the global login function!
      login(token, role); 
      
      // Send user to their correct dashboard
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'teacher') {
        navigate('/teacher');
      } else if (role === 'student') {
        navigate('/student');
      }
      
    } catch (err) {
      setError('Invalid email or password.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
};

export default LoginPage;