import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { Role } from './types';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role | Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
  if (!allowed) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}
