const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado'
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
  return WORKFLOW_STATUS_LABELS[status] ?? toHuman(status);
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
