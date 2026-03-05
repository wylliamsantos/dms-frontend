import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listActiveAuditAlerts, listAuditEvents } from '@/api/audit';
import { LoadingState } from '@/components/LoadingState';
import { env } from '@/utils/env';
import { formatDateTime } from '@/utils/format';

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

export function AuditHistoryPage() {
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');

  const tenantId = env.defaultTenantId || 'tenant-dev';

  const query = useQuery({
    queryKey: ['audit-history-page', tenantId, entityId, userId, eventType],
    queryFn: () =>
      listAuditEvents({
        tenantId,
        entityId: entityId || undefined,
        userId: userId || undefined,
        eventType: eventType || undefined,
        page: 0,
        size: 100
      })
  });

  const alertsQuery = useQuery({
    queryKey: ['audit-alerts-active', tenantId],
    queryFn: () => listActiveAuditAlerts({ tenantId })
  });

  const events = query.data?.events ?? [];
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <div className="page-document-details">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginTop: 0 }}>Histórico de auditoria</h1>
        <p style={{ color: '#64748b' }}>Consulte eventos por documento e/ou usuário.</p>

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
          <input
            className="text-input"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            placeholder="Tipo de evento (ex: DOCUMENT_VIEWED)"
          />
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
                  <strong>{event.eventType}</strong>
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
