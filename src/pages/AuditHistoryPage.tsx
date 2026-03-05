import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { exportAuditEvents, listActiveAuditAlerts, listAuditEvents } from '@/api/audit';
import { LoadingState } from '@/components/LoadingState';
import { env } from '@/utils/env';
import { formatDateTime } from '@/utils/format';
import { AUDIT_EVENT_OPTIONS, auditEventLabel } from '@/utils/labels';

const normalizeIso = (iso?: string) => {
  if (!iso) return undefined;
  const value = iso.trim();
  if (!value) return undefined;
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return hasTimezone ? value : `${value}Z`;
};

const getIp = (event: { metadata?: Record<string, unknown>; attributes?: Record<string, unknown> }) => {
  const candidates = [
    event.attributes?.ip,
    event.attributes?.clientIp,
    event.attributes?.remoteIp,
    event.metadata?.ip,
    event.metadata?.clientIp,
    event.metadata?.remoteIp
  ];
  const value = candidates.find((item) => typeof item === 'string' && item.trim().length > 0);
  return typeof value === 'string' ? value : undefined;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function AuditHistoryPage() {
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [ip, setIp] = useState('');
  const [occurredAtFrom, setOccurredAtFrom] = useState('');
  const [occurredAtTo, setOccurredAtTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const tenantId = env.defaultTenantId || 'tenant-dev';

  const filters = {
    tenantId,
    entityType: 'DOCUMENT',
    entityId: entityId.trim() || undefined,
    userId: userId.trim() || undefined,
    eventType: eventType || undefined,
    ip: ip.trim() || undefined,
    occurredAtFrom: normalizeIso(occurredAtFrom),
    occurredAtTo: normalizeIso(occurredAtTo)
  };

  const query = useQuery({
    queryKey: ['audit-history-page', tenantId, entityId, userId, eventType, ip, occurredAtFrom, occurredAtTo],
    queryFn: () =>
      listAuditEvents({
        ...filters,
        page: 0,
        size: 100
      })
  });

  const alertsQuery = useQuery({
    queryKey: ['audit-alerts-active', tenantId],
    queryFn: () => listActiveAuditAlerts({ tenantId })
  });

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const blob = await exportAuditEvents({
        ...filters,
        format,
        size: 2000
      });
      downloadBlob(blob, `audit-events.${format}`);
    } finally {
      setIsExporting(false);
    }
  };

  const events = query.data?.events ?? [];
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <div className="page-document-details">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginTop: 0 }}>Histórico de auditoria</h1>
        <p style={{ color: '#64748b' }}>Consulte eventos por documento, usuário, período e IP.</p>

        <div className="audit-filters">
          <input
            className="text-input"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Documento (entityId)"
          />
          <input
            className="text-input"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Usuário (userId)"
          />
          <select
            className="select-input"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            <option value="">Todos os eventos</option>
            {AUDIT_EVENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="text-input"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="IP (ex: 203.0.113.10)"
          />
          <input
            type="datetime-local"
            className="text-input"
            value={occurredAtFrom}
            onChange={(event) => setOccurredAtFrom(event.target.value)}
            placeholder="Data inicial"
          />
          <input
            type="datetime-local"
            className="text-input"
            value={occurredAtTo}
            onChange={(event) => setOccurredAtTo(event.target.value)}
            placeholder="Data final"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="button-secondary" type="button" onClick={() => handleExport('csv')} disabled={isExporting}>
            Exportar CSV
          </button>
          <button className="button-secondary" type="button" onClick={() => handleExport('json')} disabled={isExporting}>
            Exportar JSON
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Alertas ativos (admin)</h2>
        {alertsQuery.isLoading ? (
          <LoadingState message="Carregando alertas..." />
        ) : alerts.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma anomalia ativa no momento.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {alerts.map((alert) => (
              <div
                key={`${alert.code}-${alert.detectedAt}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${alert.severity === 'HIGH' ? '#dc2626' : '#f59e0b'}`,
                  borderRadius: 8,
                  padding: '0.75rem 1rem'
                }}
              >
                <strong>{alert.title}</strong>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>{alert.description}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {alert.severity} · {formatDateTime(normalizeIso(alert.detectedAt))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Eventos</h2>
        {query.isLoading ? (
          <LoadingState message="Carregando auditoria..." />
        ) : events.length === 0 ? (
          <p style={{ color: '#64748b' }}>Sem eventos para os filtros atuais.</p>
        ) : (
          <div className="timeline timeline--audit-page">
            {events.map((event) => (
              <div key={event.id} className="timeline__item">
                <div className="timeline__dot" />
                <div className="timeline__content">
                  <strong>{auditEventLabel(event.eventType)}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                    {(event.userId || 'system') + (event.entityId ? ` · ${event.entityId}` : '')}
                  </div>
                  {getIp(event) ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>IP: {getIp(event)}</div>
                  ) : null}
                  {event.attributes && Object.keys(event.attributes).length ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      attrs: {JSON.stringify(event.attributes)}
                    </div>
                  ) : null}
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {formatDateTime(normalizeIso(event.occurredAt))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
