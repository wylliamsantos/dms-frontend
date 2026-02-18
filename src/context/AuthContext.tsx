import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { setAuthToken, setTenantId } from '@/api/client';
import { authAdapter, type AuthSession } from '@/auth/OidcAdapter';
import { hasAnyRole } from '@/auth/roles';
import { env } from '@/utils/env';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
  roles: string[];
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  roles: string[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: null,
  roles: []
};

const tenantClaimKey = 'tenant_id' as const;

function resolveTenantId(token?: string | null): string | null {
  if (!token) {
    return env.defaultTenantId || null;
  }

  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );

    const claims = JSON.parse(json) as Record<string, unknown>;
    const value = claims[tenantClaimKey];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  } catch (error) {
    console.warn('[Auth] Failed to resolve tenant claim from token', error);
  }

  return null;
}

function applySessionToState(session: AuthSession): AuthState {
  return {
    isAuthenticated: session.isAuthenticated,
    isLoading: false,
    token: session.token ?? null,
    roles: session.roles ?? []
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const loginInvokedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const updateFromSession = (session: AuthSession) => {
      if (!isActive) {
        return;
      }
      setAuthToken(session.token ? `Bearer ${session.token}` : undefined);
      const resolvedTenantId = resolveTenantId(session.token);
      if (session.isAuthenticated && !resolvedTenantId) {
        console.warn('[Auth] Authenticated session without tenant_id claim; clearing X-Tenant-Id header');
      }
      setTenantId(resolvedTenantId);
      setState(applySessionToState(session));
      if (session.isAuthenticated) {
        loginInvokedRef.current = false;
      }
    };

    authAdapter
      .init()
      .then((session) => {
        updateFromSession(session);
        if (
          env.idpAutoLogin &&
          !session.isAuthenticated &&
          !loginInvokedRef.current &&
          !authAdapter.hasPendingAuth()
        ) {
          loginInvokedRef.current = true;
          authAdapter.login().catch((error) => {
            console.error('[Auth] Automatic login failed', error);
            loginInvokedRef.current = false;
          });
        }
      })
      .catch((error) => {
        console.error('[Auth] Failed to initialize authentication', error);
        setAuthToken(undefined);
        setTenantId(env.defaultTenantId || undefined);
        if (isActive) {
          setState({ isAuthenticated: false, isLoading: false, token: null, roles: [] });
        }
      });

    const unsubscribe = authAdapter.subscribe(updateFromSession);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(() => {
    loginInvokedRef.current = true;
    authAdapter.login().catch((error) => {
      console.error('[Auth] login failed', error);
      loginInvokedRef.current = false;
    });
  }, []);

  const logout = useCallback(() => {
    loginInvokedRef.current = false;
    authAdapter
      .logout()
      .catch((error) => {
        console.error('[Auth] logout failed', error);
        setAuthToken(undefined);
        setTenantId(env.defaultTenantId || undefined);
        setState(initialState);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      token: state.token,
      login,
      logout,
      roles: state.roles,
      hasRole: (role: string) => state.roles.includes(role),
      hasAnyRole: (roles: string[]) => hasAnyRole(state.roles, roles)
    }),
    [state.isAuthenticated, state.isLoading, state.token, state.roles, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
