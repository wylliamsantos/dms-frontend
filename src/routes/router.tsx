import { createBrowserRouter } from 'react-router-dom';

import { RoleGuard } from '@/components/RoleGuard';
import { MainLayout } from '@/components/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/auth/roles';
import { DocumentDetailsPage } from '@/pages/DocumentDetailsPage';
import { DocumentUploadPage } from '@/pages/DocumentUploadPage';
import { CategoryManagementPage } from '@/pages/CategoryManagementPage';
import { SearchPage } from '@/pages/SearchPage';
import { WorkflowPendingPage } from '@/pages/WorkflowPendingPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

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
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.search]}
            description="Você não tem permissão para consultar documentos."
          >
            <SearchPage />
          </RoleGuard>
        )
      },
      {
        path: 'documents/new',
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.uploadDocument]}
            description="Você não tem permissão para enviar documentos."
          >
            <DocumentUploadPage />
          </RoleGuard>
        )
      },
      {
        path: 'documents/:documentId',
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.search]}
            description="Você não tem permissão para consultar documentos."
          >
            <DocumentDetailsPage />
          </RoleGuard>
        )
      },
      {
        path: 'categories',
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.manageCategories]}
            description="Você não tem permissão para gerenciar categorias."
          >
            <CategoryManagementPage />
          </RoleGuard>
        )
      },
      {
        path: 'workflow/pending',
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.reviewWorkflow]}
            description="Você não tem permissão para revisar pendências."
          >
            <WorkflowPendingPage />
          </RoleGuard>
        )
      },
      {
        path: 'onboarding',
        element: (
          <RoleGuard
            allowedRoles={[...PERMISSIONS.search]}
            description="Você não tem permissão para acessar o onboarding."
          >
            <OnboardingPage />
          </RoleGuard>
        )
      }
    ]
  }
]);
