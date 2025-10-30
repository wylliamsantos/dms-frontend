import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { AppHeader } from './navigation/AppHeader';
import { SideNavigation } from './navigation/SideNavigation';
export function MainLayout() {
    return (_jsxs("div", { className: "app-shell", children: [_jsx(AppHeader, {}), _jsxs("div", { className: "app-body", children: [_jsx("aside", { className: "app-sidebar", children: _jsx(SideNavigation, {}) }), _jsx("main", { className: "app-content", children: _jsx(Outlet, {}) })] }), _jsx("footer", { className: "app-footer", children: _jsxs("span", { children: ["DMS Console \u00B7 ", new Date().getFullYear()] }) })] }));
}
