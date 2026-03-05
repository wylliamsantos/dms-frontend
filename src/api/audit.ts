import { auditApi } from './client';

export interface AuditEventItem {
  id: string;
  eventType: string;
  occurredAt?: string;
  ingestedAt?: string;
  userId?: string;
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  filename?: string;
  metadata?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

export interface AuditEventsResponse {
  events: AuditEventItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AuditAlertItem {
  code: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  title: string;
  description: string;
  detectedAt: string;
  context?: Record<string, unknown>;
}

export interface AuditAlertsResponse {
  alerts: AuditAlertItem[];
  total: number;
}

export async function listAuditEvents(params: {
  tenantId: string;
  entityId?: string;
  entityType?: string;
  userId?: string;
  eventType?: string;
  occurredAtFrom?: string;
  occurredAtTo?: string;
  page?: number;
  size?: number;
}) {
  const response = await auditApi.get<AuditEventsResponse>('/v1/audit/events', { params });
  return response.data;
}

export async function listActiveAuditAlerts(params: { tenantId: string }) {
  const response = await auditApi.get<AuditAlertsResponse>('/v1/audit/alerts/active', { params });
  return response.data;
}
