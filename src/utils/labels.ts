export type WorkflowStatusTone = 'warning' | 'success' | 'danger' | 'muted';

const WORKFLOW_STATUS_META: Record<string, { label: string; tone: WorkflowStatusTone }> = {
  DRAFT: { label: 'Rascunho', tone: 'muted' },
  PENDING_REVIEW: { label: 'Pendente', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'success' },
  REJECTED: { label: 'Reprovado', tone: 'danger' }
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  DOCUMENT_UPLOADED: 'Documento enviado',
  DOCUMENT_VIEWED: 'Documento visualizado',
  DOCUMENT_DELETED: 'Documento excluído',
  DOCUMENT_WATCHED: 'Documento capturado (watcher)',
  WORKFLOW_TRANSITIONED: 'Workflow alterado',
  DOCUMENT_DOWNLOAD_FAILED: 'Falha no download',
  DOCUMENT_ACCESS_DENIED: 'Acesso negado'
};

export function workflowStatusLabel(status?: string) {
  if (!status) return '-';
  return WORKFLOW_STATUS_META[status]?.label ?? toHuman(status);
}

export function workflowStatusClassName(status?: string) {
  if (!status) return 'badge badge--muted';
  const tone = WORKFLOW_STATUS_META[status]?.tone ?? 'muted';
  return `badge badge--${tone}`;
}

export function auditEventLabel(eventType?: string) {
  if (!eventType) return '-';
  return AUDIT_EVENT_LABELS[eventType] ?? toHuman(eventType);
}

export const AUDIT_EVENT_OPTIONS = Object.entries(AUDIT_EVENT_LABELS).map(([value, label]) => ({ value, label }));

function toHuman(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
