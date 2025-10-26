
import { createContext, useState, useContext, type ReactNode } from 'react';

// Define the shape of your auth data
interface AuthState {
  token: string | null;
  role: 'student' | 'teacher' | 'admin' | null;
}

// Define what the context will provide
interface AuthContextType {
  auth: AuthState;
  login: (token: string, role: 'student' | 'teacher' | 'admin') => void;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the "provider" component that wraps your app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({ token: null, role: null });

  const login = (token: string, role: 'student' | 'teacher' | 'admin') => {
    // NOTE: You must decode the JWT here to get the 'role'
    // For now, we'll just pass it in.
    setAuth({ token, role });
    localStorage.setItem('token', token); // Save token to local storage
  };

  const logout = () => {
    setAuth({ token: null, role: null });
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};