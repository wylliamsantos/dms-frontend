import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/LoadingState';
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading, login } = useAuth();
    if (isLoading) {
        return _jsx(LoadingState, { message: "Carregando autentica\u00E7\u00E3o" });
    }
    if (!isAuthenticated) {
        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }, children: [_jsx(LoadingState, { message: "Sess\u00E3o n\u00E3o autenticada" }), _jsx("button", { type: "button", onClick: login, className: "login-button", children: "Entrar" })] }));
    }
    return _jsx(_Fragment, { children: children });
}
