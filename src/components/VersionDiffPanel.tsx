import { useEffect, useMemo, useState } from 'react';

import { useDocumentBase64, useDocumentVersionDiff } from '@/hooks/useDocumentDetails';
import { DmsDocumentSearchResponse } from '@/types/document';

interface VersionDiffPanelProps {
  documentId?: string;
  versions: DmsDocumentSearchResponse[];
}

type JsonDiffChangeType = 'ADDED' | 'REMOVED' | 'CHANGED';

interface JsonDiffChange {
  path: string;
  changeType: JsonDiffChangeType;
  before: unknown;
  after: unknown;
}

const JSON_CONTENT_HINT = /json/i;

function decodeBase64ToUtf8(base64: string): string {
  const clean = base64.includes(',') ? base64.split(',').pop() ?? base64 : base64;
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function formatPath(parent: string, key: string | number, isArrayIndex: boolean): string {
  if (!parent) {
    return isArrayIndex ? `[${key}]` : String(key);
  }
  return isArrayIndex ? `${parent}[${key}]` : `${parent}.${key}`;
}

function diffJsonValues(baseValue: unknown, targetValue: unknown, currentPath = ''): JsonDiffChange[] {
  if (Object.is(baseValue, targetValue)) {
    return [];
  }

  const baseIsArray = Array.isArray(baseValue);
  const targetIsArray = Array.isArray(targetValue);

  if (baseIsArray && targetIsArray) {
    const changes: JsonDiffChange[] = [];
    const max = Math.max(baseValue.length, targetValue.length);
    for (let index = 0; index < max; index += 1) {
      const hasBase = index < baseValue.length;
      const hasTarget = index < targetValue.length;
      const path = formatPath(currentPath, index, true);
      if (!hasBase && hasTarget) {
        changes.push({ path, changeType: 'ADDED', before: null, after: targetValue[index] });
        continue;
      }
      if (hasBase && !hasTarget) {
        changes.push({ path, changeType: 'REMOVED', before: baseValue[index], after: null });
        continue;
      }
      changes.push(...diffJsonValues(baseValue[index], targetValue[index], path));
    }
    return changes;
  }

  const baseIsObject = Boolean(baseValue) && typeof baseValue === 'object' && !baseIsArray;
  const targetIsObject = Boolean(targetValue) && typeof targetValue === 'object' && !targetIsArray;

  if (baseIsObject && targetIsObject) {
    const baseRecord = baseValue as Record<string, unknown>;
    const targetRecord = targetValue as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(baseRecord), ...Object.keys(targetRecord)])).sort();
    const changes: JsonDiffChange[] = [];

    for (const key of keys) {
      const hasBase = key in baseRecord;
      const hasTarget = key in targetRecord;
      const path = formatPath(currentPath, key, false);

      if (!hasBase && hasTarget) {
        changes.push({ path, changeType: 'ADDED', before: null, after: targetRecord[key] });
        continue;
      }

      if (hasBase && !hasTarget) {
        changes.push({ path, changeType: 'REMOVED', before: baseRecord[key], after: null });
        continue;
      }

      changes.push(...diffJsonValues(baseRecord[key], targetRecord[key], path));
    }

    return changes;
  }

  return [
    {
      path: currentPath || '(raiz)',
      changeType: 'CHANGED',
      before: baseValue,
      after: targetValue
    }
  ];
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function VersionDiffPanel({ documentId, versions }: VersionDiffPanelProps) {
  const availableVersions = useMemo(
    () => versions.map((item) => item.entry?.version).filter((value): value is string => Boolean(value)),
    [versions]
  );

  const [baseVersion, setBaseVersion] = useState<string | undefined>(availableVersions[1]);
  const [targetVersion, setTargetVersion] = useState<string | undefined>(availableVersions[0]);

  useEffect(() => {
    if (availableVersions.length < 2) {
      return;
    }
    if (!baseVersion || !availableVersions.includes(baseVersion)) {
      setBaseVersion(availableVersions[1]);
    }
    if (!targetVersion || !availableVersions.includes(targetVersion)) {
      setTargetVersion(availableVersions[0]);
    }
  }, [availableVersions, baseVersion, targetVersion]);

  const diffQuery = useDocumentVersionDiff(documentId, baseVersion, targetVersion, availableVersions.length > 1);

  const versionsByVersion = useMemo(
    () => new Map(versions.map((item) => [item.entry?.version, item])),
    [versions]
  );

  const baseMime = baseVersion ? versionsByVersion.get(baseVersion)?.entry?.content?.mimeType ?? '' : '';
  const targetMime = targetVersion ? versionsByVersion.get(targetVersion)?.entry?.content?.mimeType ?? '' : '';

  const shouldAttemptJsonDiff = Boolean(
    documentId &&
      baseVersion &&
      targetVersion &&
      (JSON_CONTENT_HINT.test(baseMime) ||
        JSON_CONTENT_HINT.test(targetMime) ||
        diffQuery.data?.contentComparison?.baseSnippet?.trim().startsWith('{') ||
        diffQuery.data?.contentComparison?.baseSnippet?.trim().startsWith('[') ||
        diffQuery.data?.contentComparison?.targetSnippet?.trim().startsWith('{') ||
        diffQuery.data?.contentComparison?.targetSnippet?.trim().startsWith('['))
  );

  const baseContentQuery = useDocumentBase64(documentId, baseVersion, shouldAttemptJsonDiff);
  const targetContentQuery = useDocumentBase64(documentId, targetVersion, shouldAttemptJsonDiff);

  const jsonDiff = useMemo(() => {
    if (!shouldAttemptJsonDiff || !baseContentQuery.data || !targetContentQuery.data) {
      return { available: false as const, changes: [] as JsonDiffChange[] };
    }

    try {
      const baseText = decodeBase64ToUtf8(baseContentQuery.data);
      const targetText = decodeBase64ToUtf8(targetContentQuery.data);
      const baseJson = JSON.parse(baseText) as unknown;
      const targetJson = JSON.parse(targetText) as unknown;
      return {
        available: true as const,
        changes: diffJsonValues(baseJson, targetJson)
      };
    } catch {
      return { available: false as const, changes: [] as JsonDiffChange[] };
    }
  }, [baseContentQuery.data, targetContentQuery.data, shouldAttemptJsonDiff]);

  if (availableVersions.length < 2) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>O que mudou</h2>
        <p style={{ color: '#64748b' }}>É preciso ao menos duas versões para comparar alterações.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>O que mudou</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: '#334155' }}>
          Versão base
          <select value={baseVersion} onChange={(e) => setBaseVersion(e.target.value)}>
            {availableVersions.map((version) => (
              <option key={`base-${version}`} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: '#334155' }}>
          Versão alvo
          <select value={targetVersion} onChange={(e) => setTargetVersion(e.target.value)}>
            {availableVersions.map((version) => (
              <option key={`target-${version}`} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>
      </div>

      {diffQuery.isLoading ? <p style={{ color: '#64748b' }}>Comparando versões...</p> : null}
      {diffQuery.isError ? <p style={{ color: '#b91c1c' }}>Não foi possível comparar as versões selecionadas.</p> : null}

      {diffQuery.data ? (
        <>
          {jsonDiff.available ? (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Diferenças estruturadas (JSON)</h3>
              {jsonDiff.changes.length === 0 ? (
                <p style={{ color: '#64748b', margin: 0 }}>Os JSONs são equivalentes.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th>Caminho</th>
                        <th>Tipo</th>
                        <th>Antes</th>
                        <th>Depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsonDiff.changes.map((change) => (
                        <tr key={`${change.path}-${change.changeType}`}>
                          <td><code>{change.path}</code></td>
                          <td>
                            <span className={`badge ${change.changeType === 'ADDED' ? 'badge--success' : change.changeType === 'REMOVED' ? 'badge--danger' : 'badge--warning'}`}>
                              {change.changeType}
                            </span>
                          </td>
                          <td><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatDiffValue(change.before)}</code></td>
                          <td><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatDiffValue(change.after)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {diffQuery.data.metadataChanges.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma diferença de metadados encontrada.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {diffQuery.data.metadataChanges.map((change) => (
                <div
                  key={`${change.field}-${change.changeType}`}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{change.field}</strong>
                    <span className="badge badge--muted">{change.changeType}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Antes</div>
                      <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{change.before ?? '-'}</code>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Depois</div>
                      <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{change.after ?? '-'}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Comparação textual (fallback)</h3>
            {diffQuery.data.contentComparison?.available ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div>
                  <span className="badge badge--muted">{diffQuery.data.contentComparison.changeType}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Trecho versão base</div>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {diffQuery.data.contentComparison.baseSnippet ?? '-'}
                    </code>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Trecho versão alvo</div>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {diffQuery.data.contentComparison.targetSnippet ?? '-'}
                    </code>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Comparação textual indisponível para esse tipo de arquivo.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
