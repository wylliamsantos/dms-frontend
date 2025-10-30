import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { DocumentDetailsPage } from '@/pages/DocumentDetailsPage';
import { DocumentUploadPage } from '@/pages/DocumentUploadPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { SearchPage } from '@/pages/SearchPage';
export const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(MainLayout, {}),
        children: [
            {
                index: true,
                element: _jsx(SearchPage, {})
            },
            {
                path: 'documents/new',
                element: _jsx(DocumentUploadPage, {})
            },
            {
                path: 'documents/:documentId',
                element: _jsx(DocumentDetailsPage, {})
            },
            {
                path: 'categories',
                element: _jsx(CategoryManagementPage, {})
            }
        ]
    }
]);
