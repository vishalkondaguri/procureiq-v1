import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '@/core/components/LoadingScreen';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
