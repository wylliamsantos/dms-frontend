import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { I18nProvider } from '@/i18n';
import './styles/global.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1
        }
    }
});
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');
}
const root = createRoot(container);
root.render(_jsx(StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(I18nProvider, { children: _jsx(RouterProvider, { router: router }) }) }) }));
