export interface DocumentId {
  id: string;
  version: string;
}

export type DocumentGroup = 'PERSONAL' | 'LEGAL' | 'CUSTOM';

export interface DocumentCategoryType {
  name: string;
  description?: string;
  validityInDays?: number;
  requiredAttributes?: string;
}

export interface DocumentCategory {
  id?: string;
  name: string;
  title?: string;
  description?: string;
  documentGroup?: DocumentGroup;
  uniqueAttributes?: string;
  businessKeyField?: string;
  validityInDays?: number;
  schema?: Record<string, unknown>;
  types?: DocumentCategoryType[];
  active?: boolean;
}

export type CategoryPayload = Omit<DocumentCategory, 'id'>;

export interface DmsContent {
  mimeType?: string;
  mimeTypeName?: string;
  sizeInBytes?: number;
  encoding?: string;
}

export interface DmsEntry {
  createdAt?: string;
  modifiedAt?: string;
  name?: string;
  id?: string;
  category?: string;
  version?: string;
  versionType?: string;
  content?: DmsContent;
  properties?: Record<string, unknown>;
}

export interface DmsDocumentSearchResponse {
  entry?: DmsEntry;
}

export interface DocumentInformationResponse {
  entry?: DmsEntry;
}

export interface VersionPage {
  content: DmsDocumentSearchResponse[];
  totalElements: number;
  number: number;
  size: number;
}

export interface VersionsResponse {
  list: VersionPage;
}

export interface SearchEntry {
  createdAt?: string;
  modifiedAt?: string;
  name?: string;
  location?: string;
  id?: string;
  nodeType?: string;
  parentId?: string;
  content?: {
    mimeType?: string;
    mimeTypeName?: string;
  };
  version?: string;
  versionType?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}
