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
  ocrText?: string;
  importantExtractedMetadata?: Record<string, unknown>;
}

export interface DocumentInsightSignal {
  signal: string;
  description: string;
  active: boolean;
}

export interface DocumentInsightActionHint {
  field: string;
  action: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  suggestedValue?: string;
  evidenceExcerpt?: string;
}

export interface MetadataUpdateHistoryEntry {
  field: string;
  previousValue?: string;
  newValue?: string;
  source?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MetadataUpdateHistoryPageResponse {
  content: MetadataUpdateHistoryEntry[];
  totalElements: number;
  number: number;
  size: number;
}

export interface MetadataUpdateHistoryBucket {
  key: string;
  count: number;
}

export interface MetadataUpdateHistorySummaryResponse {
  totalEntries: number;
  filteredEntries: number;
  latestUpdatedAt?: string;
  bySource: MetadataUpdateHistoryBucket[];
  byField: MetadataUpdateHistoryBucket[];
}

export interface MetadataUpdateHistoryCategorySummaryResponse {
  category?: string;
  totalDocumentsInCategory: number;
  totalDocumentsWithUpdates: number;
  totalEntries: number;
  filteredEntries: number;
  latestUpdatedAt?: string;
  bySource: MetadataUpdateHistoryBucket[];
  byField: MetadataUpdateHistoryBucket[];
}

export interface MetadataUpdateAdoptionTrendPoint {
  label: string;
  totalUpdates: number;
  ocrHintUpdates: number;
  ocrHintCancelUpdates: number;
  ocrHintErrorUpdates: number;
  ocrHintRate: number;
}

export interface MetadataUpdateOcrHintAdoption {
  documentTotalUpdates: number;
  documentOcrHintUpdates: number;
  documentOcrHintCancelUpdates: number;
  documentOcrHintErrorUpdates: number;
  documentOcrHintRate: number;
  categoryTotalUpdates: number;
  categoryOcrHintUpdates: number;
  categoryOcrHintCancelUpdates: number;
  categoryOcrHintErrorUpdates: number;
  categoryOcrHintRate: number;
  lookbackDaysApplied: number;
  trend: MetadataUpdateAdoptionTrendPoint[];
}

export interface MetadataRegressionAlert {
  dimension: 'SOURCE' | 'FIELD' | string;
  key: string;
  documentCount: number;
  categoryCount: number;
  documentRatio: number;
  categoryRatio: number;
  deltaRatio: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  message: string;
}

export interface DocumentInsightResponse {
  documentId: string;
  version?: string;
  summary?: string;
  keyMetadata?: Record<string, unknown>;
  warnings?: string[];
  confidence?: number;
  confidenceBand?: 'HIGH' | 'MEDIUM' | 'LOW';
  source?: string;
  generatedAt?: string;
  signals?: DocumentInsightSignal[];
  persistedMetadataPreview?: Record<string, unknown>;
  importantPersistedMetadata?: Record<string, unknown>;
  persistedMetadataCount?: number;
  hasPersistedOcrText?: boolean;
  expectedRequiredMetadata?: string[];
  missingRequiredMetadata?: string[];
  requiredMetadataCoveragePercent?: number;
  metadataActionHints?: DocumentInsightActionHint[];
  metadataUpdateHistory?: MetadataUpdateHistoryEntry[];
  metadataRegressionAlerts?: MetadataRegressionAlert[];
  ocrHintAdoption?: MetadataUpdateOcrHintAdoption;
  ocrStats?: Record<string, unknown>;
}

export interface DocumentRagChunk {
  source: string;
  score: number;
  excerpt: string;
}

export interface DocumentRagContextResponse {
  documentId: string;
  version?: string;
  enabled: boolean;
  status: string;
  message: string;
  category?: string;
  chunkCount?: number;
  averageScore?: number;
  latencyMs?: number;
  qualityBand?: 'HIGH' | 'MEDIUM' | 'LOW' | 'BLOCKED' | string;
  missingRequiredMetadata?: string[];
  chunks: DocumentRagChunk[];
}

export interface DocumentChatResponse {
  documentId: string;
  version?: string;
  enabled: boolean;
  status: string;
  message: string;
  answer?: string;
  model?: string;
  latencyMs?: number;
  contextChunks: string[];
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
