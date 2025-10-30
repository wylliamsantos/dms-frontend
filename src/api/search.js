import { searchApi } from './client';
export async function searchByCpf(payload) {
    const response = await searchApi.post('/v1/search/byCpf', payload);
    return response.data;
}
export async function searchByMetadata(payload) {
    const formData = new URLSearchParams();
    formData.set('type', payload.type);
    if (payload.metadata)
        formData.set('metadata', payload.metadata);
    if (typeof payload.skipCount === 'number')
        formData.set('skipCount', String(payload.skipCount));
    if (typeof payload.maxItems === 'number')
        formData.set('maxItems', String(payload.maxItems));
    if (payload.searchScope)
        formData.set('searchScope', payload.searchScope);
    if (payload.versionType)
        formData.set('versionType', payload.versionType);
    const response = await searchApi.post('/v1/search/byMetadata', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
}
