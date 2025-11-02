// src/pages/LoginPage.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';
import { jwtDecode } from 'jwt-decode';
import styled from 'styled-components';
import messages from '../config/messages.json';

// Define the shape of your decoded token
interface DecodedToken {
  role: 'student' | 'teacher' | 'admin';
  iat: number;
  exp: number;
}

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

const ForgotPassword = styled.a`
  display: block;
  text-align: center;
  color: #bdbdbd;
  text-decoration: none;
  font-size: 13px;
  margin: 20px 0;
  
  &:hover {
    color: #f5a623;
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

const SignupLink = styled.span`
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

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
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
      setError(messages.login.errorInvalidCredentials);
    }
  };

  return (
    <Container>
      <FormCard>
        <Header>
          <Title>{messages.login.title}</Title>
          <Subtitle>{messages.login.subtitle}</Subtitle>
        </Header>
        <FormContent onSubmit={handleSubmit}>
          <InputGroup>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={messages.login.emailPlaceholder}
              required
            />
          </InputGroup>
          <InputGroup>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={messages.login.passwordPlaceholder}
              required
            />
          </InputGroup>
          <ForgotPassword href="#">{messages.login.forgotPassword}</ForgotPassword>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <SubmitButton type="submit">{messages.login.submitButton}</SubmitButton>
          <Footer>
            {messages.login.noAccountText} <SignupLink onClick={() => navigate('/register')}>{messages.login.signupLink}</SignupLink>
          </Footer>
        </FormContent>
      </FormCard>
    </Container>
  );
};

export default LoginPage;