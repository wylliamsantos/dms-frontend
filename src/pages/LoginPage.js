import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';
export function LoginPage() {
    const { login } = useAuth();
    const { t } = useTranslation();
    return (_jsx("div", { className: "login-page", children: _jsxs("div", { className: "login-card", children: [_jsx("h1", { children: t('login.title') }), _jsx("p", { children: t('login.description') }), _jsx("button", { type: "button", style: { marginTop: '1.5rem' }, className: "login-button", onClick: login, children: t('login.redirecting') })] }) }));
}
