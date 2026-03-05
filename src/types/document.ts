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
  workflowStatus?: string;
  content?: DmsContent;
  properties?: Record<string, unknown>;
  ocrSummary?: string;
  importantExtractedMetadata?: Record<string, unknown>;
}

export interface DocumentInsightResponse {
  documentId: string;
  version?: string;
  summary?: string;
  keyMetadata?: Record<string, unknown>;
  warnings?: string[];
  confidence?: number;
  source?: string;
}

export interface DocumentRagContextResponse {
  documentId: string;
  version?: string;
  enabled: boolean;
  status: string;
  message: string;
  chunks: string[];
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

export type DocumentVersionChangeType = 'ADDED' | 'REMOVED' | 'CHANGED';

export interface DocumentVersionMetadataChange {
  field: string;
  before: string | null;
  after: string | null;
  changeType: DocumentVersionChangeType;
}

export interface DocumentVersionContentComparison {
  available: boolean;
  changeType: string;
  baseSnippet: string | null;
  targetSnippet: string | null;
}

export interface DocumentVersionDiffResponse {
  documentId: string;
  baseVersion: string;
  targetVersion: string;
  metadataChanges: DocumentVersionMetadataChange[];
  contentComparison?: DocumentVersionContentComparison;
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
  workflowStatus?: string;
  highlights?: string[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}
