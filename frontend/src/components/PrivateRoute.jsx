import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const toastFired = useRef(false);

  const accessDenied = !loading && !!user && !!role && user.role !== role;

  useEffect(() => {
    if (accessDenied && !toastFired.current) {
      toastFired.current = true;
      toast.error('You do not have permission to access that page.');
    }
  }, [accessDenied]);

  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;

  // Force password change before allowing access to any other page
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;

  return children;
}
