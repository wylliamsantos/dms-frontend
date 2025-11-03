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

import { setAuthToken } from '@/api/client';
import { authAdapter, type AuthSession } from '@/auth/OidcAdapter';
import { env } from '@/utils/env';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
  roles: string[];
  hasRole: (role: string) => boolean;
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
      hasRole: (role: string) => state.roles.includes(role)
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
