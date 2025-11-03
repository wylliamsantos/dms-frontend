import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAuthToken } from '@/api/client';
import { authAdapter } from '@/auth/OidcAdapter';
import { env } from '@/utils/env';
const AuthContext = createContext(undefined);
const initialState = {
    isAuthenticated: false,
    isLoading: true,
    token: null,
    roles: []
};
function applySessionToState(session) {
    return {
        isAuthenticated: session.isAuthenticated,
        isLoading: false,
        token: session.token ?? null,
        roles: session.roles ?? []
    };
}
export function AuthProvider({ children }) {
    const [state, setState] = useState(initialState);
    const loginInvokedRef = useRef(false);
    useEffect(() => {
        let isActive = true;
        const updateFromSession = (session) => {
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
            if (env.idpAutoLogin &&
                !session.isAuthenticated &&
                !loginInvokedRef.current &&
                !authAdapter.hasPendingAuth()) {
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
    const value = useMemo(() => ({
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        token: state.token,
        login,
        logout,
        roles: state.roles,
        hasRole: (role) => state.roles.includes(role)
    }), [state.isAuthenticated, state.isLoading, state.token, state.roles, login, logout]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
