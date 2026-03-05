import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listAuditEvents } from '@/api/audit';
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

  const query = useQuery({
    queryKey: ['audit-history-page', entityId, userId, eventType],
    queryFn: () =>
      listAuditEvents({
        tenantId: env.defaultTenantId || 'tenant-dev',
        entityId: entityId || undefined,
        userId: userId || undefined,
        eventType: eventType || undefined,
        page: 0,
        size: 100
      })
  });

  const events = query.data?.events ?? [];

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
