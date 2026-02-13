import { documentApi } from './client';

export interface WorkflowTransitionItem {
  fromStatus: string;
  toStatus: string;
  actor: string;
  reason: string;
  changedAt: string;
}

export interface PendingDocumentItem {
  documentId: string;
  filename: string;
  category: string;
  workflowStatus: string;
  currentVersion: string;
  author: string;
  businessKeyType?: string;
  businessKeyValue?: string;
  updatedAt: string;
}

export interface PendingDocumentsPage {
  content: PendingDocumentItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface WorkflowReviewRequest {
  action: 'APPROVE' | 'REPROVE';
  reason?: string;
}

export interface WorkflowReviewResponse {
  documentId: string;
  workflowStatus: string;
  message: string;
}

export async function listWorkflowHistory(documentId: string) {
  const response = await documentApi.get<WorkflowTransitionItem[]>(`/v1/workflow/documents/${documentId}/history`);
  return response.data;
}

export async function listPendingWorkflow(params?: {
  category?: string;
  author?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}) {
  const response = await documentApi.get<PendingDocumentsPage>('/v1/workflow/pending', { params });
  return response.data;
}

export async function reviewWorkflowDocument(documentId: string, payload: WorkflowReviewRequest) {
  const response = await documentApi.post<WorkflowReviewResponse>(`/v1/workflow/documents/${documentId}/review`, payload);
  return response.data;
}
