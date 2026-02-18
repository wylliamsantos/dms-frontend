import { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ErrorState } from '@/components/ErrorState';

interface RoleGuardProps {
  allowedRoles: string[];
  title?: string;
  description?: string;
  children: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  title = 'Acesso negado',
  description = 'Você não tem permissão para acessar esta área.',
  children
}: RoleGuardProps) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(allowedRoles)) {
    return <ErrorState title={title} description={description} />;
  }

  return <>{children}</>;
}
