// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthTokenRole';

interface UserCheckProps {
  allowedRoles?: ('user' | 'admin')[];
}

export const UserCheck = ({ allowedRoles }: UserCheckProps) => {
  const { auth } = useAuth();

  if (!auth.token) {
    // User not logged in
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(auth.role!)) {
    // User logged in, but doesn't have the right role
    return <Navigate to="/unauthorized" replace />; // Or back to user page
  }

  // User is logged in AND has the right role (or no role was specified)
  return <Outlet />; // This renders the child component (e.g., UserLanding)
};