import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export function AppHeader() {
    return (_jsxs("header", { className: "app-header", children: [_jsx("div", { className: "app-header__brand", children: _jsx(Link, { to: "/", children: "DMS Console" }) }), _jsx("div", { className: "app-header__meta", children: _jsxs("span", { className: "app-header__version", children: ["v", typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'] }) })] }));
}
