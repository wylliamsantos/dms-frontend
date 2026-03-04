import { searchApi } from './client';
import { PageResponse, SearchEntry } from '@/types/document';

type SearchScope = 'ALL' | 'LATEST' | 'MAJOR' | 'MINOR';
type VersionType = 'MAJOR' | 'MINOR' | 'ALL';

export interface SearchByBusinessKeyPayload {
  businessKeyType: string;
  businessKeyValue: string;
  documentCategoryNames: string[];
  textQuery?: string;
  searchScope?: SearchScope;
  versionType?: VersionType;
  page?: number;
  size?: number;
}

export async function searchByBusinessKey(payload: SearchByBusinessKeyPayload) {
  const response = await searchApi.post<PageResponse<SearchEntry>>('/v1/search/byBusinessKey', payload);
  return response.data;
}

export interface SearchByMetadataPayload {
  type: string;
  metadata?: string;
  skipCount?: number;
  maxItems?: number;
  searchScope?: SearchScope;
  versionType?: VersionType;
}

export async function searchByMetadata(payload: SearchByMetadataPayload) {
  const formData = new URLSearchParams();
  formData.set('type', payload.type);
  if (payload.metadata) formData.set('metadata', payload.metadata);
  if (typeof payload.skipCount === 'number') formData.set('skipCount', String(payload.skipCount));
  if (typeof payload.maxItems === 'number') formData.set('maxItems', String(payload.maxItems));
  if (payload.searchScope) formData.set('searchScope', payload.searchScope);
  if (payload.versionType) formData.set('versionType', payload.versionType);

  const response = await searchApi.post<PageResponse<SearchEntry>>('/v1/search/byMetadata', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data;
}
