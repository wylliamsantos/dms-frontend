import { documentApi } from './client';
import {
  CategoryPayload,
  DocumentCategory,
  DocumentId,
  DocumentInformationResponse,
  VersionsResponse
} from '@/types/document';

export async function listCategories(): Promise<DocumentCategory[]> {
  const response = await documentApi.get<DocumentCategory[]>('/v1/categories/all');
  console.debug('[API] listCategories response', response.status, response.data);
  return response.data;
}

export async function fetchDocumentInformation(documentId: string, version?: string) {
  const path = version
    ? `/v1/documents/${documentId}/${version}/information`
    : `/v1/documents/${documentId}/information`;
  const response = await documentApi.get<DocumentInformationResponse>(path);
  return response.data;
}

export async function fetchDocumentVersions(documentId: string) {
  const response = await documentApi.get<VersionsResponse>(`/v1/documents/${documentId}/versions`);
  return response.data;
}

export async function fetchDocumentBase64(documentId: string, version?: string) {
  const path = version
    ? `/v1/documents/${documentId}/${version}/base64`
    : `/v1/documents/${documentId}/base64`;
  const response = await documentApi.get<string>(path, { responseType: 'text' });
  return response.data;
}

export async function fetchDocumentBinary(documentId: string, version?: string) {
  const path = version
    ? `/v1/documents/${documentId}/${version}/content`
    : `/v1/documents/${documentId}/content`;
  const response = await documentApi.get<ArrayBuffer>(path, { responseType: 'arraybuffer' });
  return response.data;
}

export async function uploadDocumentMultipart(payload: FormData) {
  const response = await documentApi.post<DocumentId>('/v1/documents/multipart', payload, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export interface PresignedUploadPayload {
  comment?: string;
  isFinal: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  metadata: string;
  author?: string;
  issuingDate?: string;
}

export interface PresignedUploadResponse {
  id: DocumentId;
  url: string;
}

export async function generatePresignedUpload(payload: PresignedUploadPayload) {
  const response = await documentApi.post<PresignedUploadResponse>('/v1/documents/presigned/url', payload);
  return response.data;
}

export interface FinalizeUploadPayload {
  version: string;
  fileSize: number;
  mimeType?: string;
}

export async function finalizeDocumentUpload(documentId: string, payload: FinalizeUploadPayload) {
  const response = await documentApi.put<DocumentId>(`/v1/documents/${documentId}/finalize`, payload);
  return response.data;
}

export async function createCategory(payload: CategoryPayload) {
  const response = await documentApi.post<DocumentCategory>('/v1/categories', payload);
  return response.data;
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  const response = await documentApi.put<DocumentCategory>(`/v1/categories/${id}`, payload);
  return response.data;
}

export async function fetchCategory(id: string) {
  const response = await documentApi.get<DocumentCategory>(`/v1/categories/${id}`);
  return response.data;
}
