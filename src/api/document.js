import { documentApi } from './client';
export async function listCategories() {
    const response = await documentApi.get('/v1/categories/all');
    console.debug('[API] listCategories response', response.status, response.data);
    return response.data;
}
export async function fetchDocumentInformation(documentId, version) {
    const path = version
        ? `/v1/documents/${documentId}/${version}/information`
        : `/v1/documents/${documentId}/information`;
    const response = await documentApi.get(path);
    return response.data;
}
export async function fetchDocumentVersions(documentId) {
    const response = await documentApi.get(`/v1/documents/${documentId}/versions`);
    return response.data;
}
export async function fetchDocumentBase64(documentId, version) {
    const path = version
        ? `/v1/documents/${documentId}/${version}/base64`
        : `/v1/documents/${documentId}/base64`;
    const response = await documentApi.get(path, { responseType: 'text' });
    return response.data;
}
export async function fetchDocumentBinary(documentId, version) {
    const path = version
        ? `/v1/documents/${documentId}/${version}/content`
        : `/v1/documents/${documentId}/content`;
    const response = await documentApi.get(path, { responseType: 'arraybuffer' });
    return response.data;
}
export async function uploadDocumentMultipart(payload) {
    const response = await documentApi.post('/v1/documents/multipart', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
}
export async function generatePresignedUpload(payload) {
    const response = await documentApi.post('/v1/documents/presigned/url', payload);
    return response.data;
}
export async function finalizeDocumentUpload(documentId, payload) {
    const response = await documentApi.put(`/v1/documents/${documentId}/finalize`, payload);
    return response.data;
}
export async function createCategory(payload) {
    const response = await documentApi.post('/v1/categories', payload);
    return response.data;
}
export async function updateCategory(id, payload) {
    const response = await documentApi.put(`/v1/categories/${id}`, payload);
    return response.data;
}
export async function fetchCategory(id) {
    const response = await documentApi.get(`/v1/categories/${id}`);
    return response.data;
}
