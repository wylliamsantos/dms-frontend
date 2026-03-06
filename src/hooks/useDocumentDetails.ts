import { useQuery } from '@tanstack/react-query';

import {
  fetchDocumentBase64,
  fetchDocumentBinary,
  fetchDocumentInformation,
  fetchDocumentInsight,
  fetchDocumentRagContext,
  fetchDocumentVersionDiff,
  fetchDocumentVersions
} from '@/api/document';

export function useDocumentInformation(documentId: string | undefined, version?: string) {
  return useQuery({
    queryKey: ['document-information', documentId, version],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentInformation(documentId, version);
    },
    enabled: Boolean(documentId)
  });
}

export function useDocumentVersions(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentVersions(documentId);
    },
    enabled: Boolean(documentId)
  });
}

export function useDocumentBase64(documentId: string | undefined, version?: string, enabled?: boolean) {
  return useQuery({
    queryKey: ['document-base64', documentId, version],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentBase64(documentId, version);
    },
    enabled: Boolean(documentId) && Boolean(enabled)
  });
}

export function useDocumentBinary(documentId: string | undefined, version?: string, enabled?: boolean) {
  return useQuery({
    queryKey: ['document-binary', documentId, version],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentBinary(documentId, version);
    },
    enabled: Boolean(documentId) && Boolean(enabled)
  });
}

export function useDocumentVersionDiff(
  documentId: string | undefined,
  baseVersion?: string,
  targetVersion?: string,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ['document-version-diff', documentId, baseVersion, targetVersion],
    queryFn: () => {
      if (!documentId || !baseVersion || !targetVersion) {
        throw new Error('documentId, baseVersion and targetVersion are required');
      }
      return fetchDocumentVersionDiff(documentId, baseVersion, targetVersion);
    },
    enabled: Boolean(documentId && baseVersion && targetVersion && enabled)
  });
}

export function useDocumentInsight(documentId: string | undefined, version?: string, ocrHintLookbackDays = 30) {
  return useQuery({
    queryKey: ['document-insight', documentId, version, ocrHintLookbackDays],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentInsight(documentId, version, ocrHintLookbackDays);
    },
    enabled: Boolean(documentId)
  });
}

export function useDocumentRagContext(documentId: string | undefined, version?: string) {
  return useQuery({
    queryKey: ['document-rag-context', documentId, version],
    queryFn: () => {
      if (!documentId) throw new Error('documentId is required');
      return fetchDocumentRagContext(documentId, version);
    },
    enabled: Boolean(documentId)
  });
}
