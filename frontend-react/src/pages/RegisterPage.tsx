// src/pages/RegisterPage.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import styled from 'styled-components';

// Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
//   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const FormCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 0;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #f5a623 0%, #f7931e 100%);
  padding: 60px 40px;
  color: white;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
`;

const Title = styled.h1`
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 700;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
`;

const FormContent = styled.form`
  padding: 40px;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #f5a623;
    box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.1);
  }
  
  &::placeholder {
    color: #bdbdbd;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #f5a623 0%, #f7931e 100%);
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-top: 10px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(245, 166, 35, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: #757575;
`;

const LoginLink = styled.span`
  color: #f5a623;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMessage = styled.p`
  color: #f44336;
  font-size: 13px;
  margin: 10px 0;
  text-align: center;
`;

const SuccessMessage = styled.p`
  color: #4caf50;
  font-size: 13px;
  margin: 10px 0;
  text-align: center;
`;

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      await apiClient.post('/register', { email, password });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('Failed to register. Email may already be in use.');
    }
  };

  return (
    <Container>
      <FormCard>
        <Header>
          <Title>Create Account</Title>
          <Subtitle>Sign up to get started!</Subtitle>
        </Header>
        <FormContent onSubmit={handleSubmit}>
          <InputGroup>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </InputGroup>
          <InputGroup>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </InputGroup>
          <InputGroup>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
            />
          </InputGroup>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          <SubmitButton type="submit">Create Account</SubmitButton>
          <Footer>
            Already have an account? <LoginLink onClick={() => navigate('/login')}>Sign in</LoginLink>
          </Footer>
        </FormContent>
      </FormCard>
    </Container>
  );
};

export default RegisterPage;