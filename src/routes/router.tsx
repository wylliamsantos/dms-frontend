import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '@/components/MainLayout';
import { DocumentDetailsPage } from '@/pages/DocumentDetailsPage';
import { DocumentUploadPage } from '@/pages/DocumentUploadPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { SearchPage } from '@/pages/SearchPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <SearchPage />
      },
      {
        path: 'documents/new',
        element: <DocumentUploadPage />
      },
      {
        path: 'documents/:documentId',
        element: <DocumentDetailsPage />
      },
      {
        path: 'categories',
        element: <CategoryManagementPage />
      }
    ]
  }
]);
