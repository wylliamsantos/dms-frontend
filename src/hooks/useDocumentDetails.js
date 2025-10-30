import { useQuery } from '@tanstack/react-query';
import { fetchDocumentBase64, fetchDocumentBinary, fetchDocumentInformation, fetchDocumentVersions } from '@/api/document';
export function useDocumentInformation(documentId, version) {
    return useQuery({
        queryKey: ['document-information', documentId, version],
        queryFn: () => {
            if (!documentId)
                throw new Error('documentId is required');
            return fetchDocumentInformation(documentId, version);
        },
        enabled: Boolean(documentId)
    });
}
export function useDocumentVersions(documentId) {
    return useQuery({
        queryKey: ['document-versions', documentId],
        queryFn: () => {
            if (!documentId)
                throw new Error('documentId is required');
            return fetchDocumentVersions(documentId);
        },
        enabled: Boolean(documentId)
    });
}
export function useDocumentBase64(documentId, version, enabled) {
    return useQuery({
        queryKey: ['document-base64', documentId, version],
        queryFn: () => {
            if (!documentId)
                throw new Error('documentId is required');
            return fetchDocumentBase64(documentId, version);
        },
        enabled: Boolean(documentId) && Boolean(enabled)
    });
}
export function useDocumentBinary(documentId, version, enabled) {
    return useQuery({
        queryKey: ['document-binary', documentId, version],
        queryFn: () => {
            if (!documentId)
                throw new Error('documentId is required');
            return fetchDocumentBinary(documentId, version);
        },
        enabled: Boolean(documentId) && Boolean(enabled)
    });
}
