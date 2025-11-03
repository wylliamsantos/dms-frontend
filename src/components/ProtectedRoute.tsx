import { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return <LoadingState message="Carregando autenticação" />;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <LoadingState message="Sessão não autenticada" />
        <button type="button" onClick={login} className="login-button">
          Entrar
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
