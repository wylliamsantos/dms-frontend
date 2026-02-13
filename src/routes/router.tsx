import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '@/components/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DocumentDetailsPage } from '@/pages/DocumentDetailsPage';
import { DocumentUploadPage } from '@/pages/DocumentUploadPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { SearchPage } from '@/pages/SearchPage';
import { WorkflowPendingPage } from '@/pages/WorkflowPendingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
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
      },
      {
        path: 'workflow/pending',
        element: <WorkflowPendingPage />
      }
    ]
  }
]);
