import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
export function SideNavigation() {
    const location = useLocation();
    const { t } = useTranslation();
    const { hasRole } = useAuth();
    const isSearchActive = location.pathname === '/' ||
        (location.pathname.startsWith('/documents/') && location.pathname !== '/documents/new');
    const isCategoryActive = location.pathname.startsWith('/categories');
    const canManageCategories = hasRole('ROLE_ADMIN');
    return (_jsxs("nav", { className: "side-nav", children: [_jsxs("div", { className: "side-nav__section", children: [_jsx("span", { className: "side-nav__label", children: t('navigation.documents') }), _jsxs("ul", { className: "side-nav__list", children: [_jsx("li", { children: _jsx(NavLink, { to: "/", end: true, className: ({ isActive }) => (isActive || isSearchActive ? 'active' : undefined), children: t('navigation.consult') }) }), _jsx("li", { children: _jsx(NavLink, { to: "/documents/new", className: ({ isActive }) => (isActive ? 'active' : undefined), children: t('navigation.newDocument') }) })] })] }), canManageCategories ? (_jsxs("div", { className: "side-nav__section", children: [_jsx("span", { className: "side-nav__label", children: t('navigation.categories') }), _jsx("ul", { className: "side-nav__list", children: _jsx("li", { children: _jsx(NavLink, { to: "/categories", className: ({ isActive }) => (isActive || isCategoryActive ? 'active' : undefined), children: t('navigation.manageCategories') }) }) })] })) : null, _jsxs("div", { className: "side-nav__section", children: [_jsx("span", { className: "side-nav__label", children: t('language.label') }), _jsx(LanguageSwitcher, {})] })] }));
}
