import { useEffect, useMemo, useState } from 'react';
import JSON5 from 'json5';

import { useDocumentBase64, useDocumentVersionDiff } from '@/hooks/useDocumentDetails';
import { DmsDocumentSearchResponse } from '@/types/document';

interface VersionDiffPanelProps {
  documentId?: string;
  versions: DmsDocumentSearchResponse[];
}

type JsonDiffChangeType = 'ADDED' | 'REMOVED' | 'CHANGED';
type JsonParseMode = 'STRICT' | 'TOLERANT' | 'REPAIRED';

interface JsonDiffChange {
  path: string;
  changeType: JsonDiffChangeType;
  before: unknown;
  after: unknown;
}

interface TextDiffToken {
  value: string;
  type: 'same' | 'added' | 'removed';
}

interface LineDiffChange {
  lineBase?: number;
  lineTarget?: number;
  before: string;
  after: string;
}

interface JsonDiffResult {
  available: boolean;
  parseFailed: boolean;
  parseFailureReason?: string;
  parseMode?: JsonParseMode;
  changes: JsonDiffChange[];
  textDiff?: {
    hasDifference: boolean;
    baseTokens: TextDiffToken[];
    targetTokens: TextDiffToken[];
    lineChanges: LineDiffChange[];
  };
}

const JSON_CONTENT_HINT = /json/i;
const MAX_DIFF_TEXT_SIZE = 40_000;
const MAX_LINE_CHANGES = 18;

function decodeBase64ToUtf8(base64: string): string {
  const clean = base64.includes(',') ? base64.split(',').pop() ?? base64 : base64;
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function normalizeJsonText(raw: string): string {
  return raw.replace(/^\uFEFF/, '').trim();
}

function repairJsonText(raw: string): string {
  let repaired = normalizeJsonText(raw);
  repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  repaired = repaired.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  return repaired;
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

  return [{ path: currentPath || '(raiz)', changeType: 'CHANGED', before: baseValue, after: targetValue }];
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function tokenize(value: string): string[] {
  return value.match(/\r\n|\n|\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) ?? [];
}

function buildTokenDiff(base: string, target: string): { baseTokens: TextDiffToken[]; targetTokens: TextDiffToken[]; hasDifference: boolean } {
  const a = tokenize(base.slice(0, MAX_DIFF_TEXT_SIZE));
  const b = tokenize(target.slice(0, MAX_DIFF_TEXT_SIZE));

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  let i = 0;
  let j = 0;
  const baseTokens: TextDiffToken[] = [];
  const targetTokens: TextDiffToken[] = [];

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      baseTokens.push({ value: a[i], type: 'same' });
      targetTokens.push({ value: b[j], type: 'same' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      baseTokens.push({ value: a[i], type: 'removed' });
      i += 1;
    } else {
      targetTokens.push({ value: b[j], type: 'added' });
      j += 1;
    }
  }

  while (i < n) {
    baseTokens.push({ value: a[i], type: 'removed' });
    i += 1;
  }
  while (j < m) {
    targetTokens.push({ value: b[j], type: 'added' });
    j += 1;
  }

  const hasDifference = baseTokens.some((t) => t.type !== 'same') || targetTokens.some((t) => t.type !== 'same');
  return { baseTokens, targetTokens, hasDifference };
}

function buildLineDiff(base: string, target: string): LineDiffChange[] {
  const baseLines = base.slice(0, MAX_DIFF_TEXT_SIZE).split(/\r?\n/);
  const targetLines = target.slice(0, MAX_DIFF_TEXT_SIZE).split(/\r?\n/);

  const max = Math.max(baseLines.length, targetLines.length);
  const changes: LineDiffChange[] = [];

  for (let i = 0; i < max && changes.length < MAX_LINE_CHANGES; i += 1) {
    const before = baseLines[i] ?? '';
    const after = targetLines[i] ?? '';
    if (before === after) continue;

    changes.push({
      lineBase: i < baseLines.length ? i + 1 : undefined,
      lineTarget: i < targetLines.length ? i + 1 : undefined,
      before,
      after
    });
  }

  return changes;
}

function safeJsonParse(raw: string): { ok: true; data: unknown; mode: JsonParseMode } | { ok: false; reason: string } {
  const normalized = normalizeJsonText(raw);

  try {
    return { ok: true, data: JSON.parse(normalized), mode: 'STRICT' };
  } catch (strictError) {
    try {
      return { ok: true, data: JSON5.parse(normalized), mode: 'TOLERANT' };
    } catch {
      try {
        const repaired = repairJsonText(raw);
        return { ok: true, data: JSON5.parse(repaired), mode: 'REPAIRED' };
      } catch (repairError) {
        const strictReason = strictError instanceof Error ? strictError.message : 'Falha no parse estrito';
        const repairReason = repairError instanceof Error ? repairError.message : 'Falha no parse reparado';
        return { ok: false, reason: `${strictReason} | reparo: ${repairReason}` };
      }
    }
  }
}

function renderTokens(tokens: TextDiffToken[]) {
  return tokens.map((token, index) => {
    const style =
      token.type === 'added'
        ? { background: '#dcfce7', color: '#166534' }
        : token.type === 'removed'
          ? { background: '#fee2e2', color: '#991b1b', textDecoration: 'line-through' as const }
          : undefined;
    return (
      <span key={`${token.type}-${index}`} style={style}>
        {token.value}
      </span>
    );
  });
}

export function VersionDiffPanel({ documentId, versions }: VersionDiffPanelProps) {
  const availableVersions = useMemo(
    () => versions.map((item) => item.entry?.version).filter((value): value is string => Boolean(value)),
    [versions]
  );

  const [baseVersion, setBaseVersion] = useState<string | undefined>(availableVersions[1]);
  const [targetVersion, setTargetVersion] = useState<string | undefined>(availableVersions[0]);

  useEffect(() => {
    if (availableVersions.length < 2) return;
    if (!baseVersion || !availableVersions.includes(baseVersion)) setBaseVersion(availableVersions[1]);
    if (!targetVersion || !availableVersions.includes(targetVersion)) setTargetVersion(availableVersions[0]);
  }, [availableVersions, baseVersion, targetVersion]);

  const diffQuery = useDocumentVersionDiff(documentId, baseVersion, targetVersion, availableVersions.length > 1);

  const versionsByVersion = useMemo(() => new Map(versions.map((item) => [item.entry?.version, item])), [versions]);

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

  const jsonDiff = useMemo<JsonDiffResult>(() => {
    if (!shouldAttemptJsonDiff || !baseContentQuery.data || !targetContentQuery.data) {
      return { available: false, parseFailed: false, changes: [] };
    }

    const baseText = decodeBase64ToUtf8(baseContentQuery.data);
    const targetText = decodeBase64ToUtf8(targetContentQuery.data);

    const parsedBase = safeJsonParse(baseText);
    const parsedTarget = safeJsonParse(targetText);

    if (parsedBase.ok && parsedTarget.ok) {
      return {
        available: true,
        parseFailed: false,
        parseMode: parsedBase.mode === 'STRICT' && parsedTarget.mode === 'STRICT'
          ? 'STRICT'
          : parsedBase.mode === 'REPAIRED' || parsedTarget.mode === 'REPAIRED'
            ? 'REPAIRED'
            : 'TOLERANT',
        changes: diffJsonValues(parsedBase.data, parsedTarget.data)
      };
    }

    const textDiff = buildTokenDiff(baseText, targetText);
    const lineChanges = buildLineDiff(baseText, targetText);
    return {
      available: false,
      parseFailed: true,
      parseFailureReason: `Base: ${parsedBase.ok ? 'ok' : parsedBase.reason} | Alvo: ${parsedTarget.ok ? 'ok' : parsedTarget.reason}`,
      changes: [],
      textDiff: {
        ...textDiff,
        lineChanges
      }
    };
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
              <option key={`base-${version}`} value={version}>{version}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: '#334155' }}>
          Versão alvo
          <select value={targetVersion} onChange={(e) => setTargetVersion(e.target.value)}>
            {availableVersions.map((version) => (
              <option key={`target-${version}`} value={version}>{version}</option>
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
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                Diferenças estruturadas (JSON)
                {jsonDiff.parseMode === 'TOLERANT' ? <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: '#92400e' }}>(modo tolerante)</span> : null}
                {jsonDiff.parseMode === 'REPAIRED' ? <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: '#92400e' }}>(modo reparado)</span> : null}
              </h3>
              {jsonDiff.changes.length === 0 ? (
                <p style={{ color: '#64748b', margin: 0 }}>Sem alterações estruturais: os JSONs são equivalentes.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.88rem' }}>
                    <thead><tr><th>Caminho</th><th>Tipo</th><th>Antes</th><th>Depois</th></tr></thead>
                    <tbody>
                      {jsonDiff.changes.map((change) => (
                        <tr key={`${change.path}-${change.changeType}-${formatDiffValue(change.before)}-${formatDiffValue(change.after)}`}>
                          <td><code>{change.path}</code></td>
                          <td><span className={`badge ${change.changeType === 'ADDED' ? 'badge--success' : change.changeType === 'REMOVED' ? 'badge--danger' : 'badge--warning'}`}>{change.changeType}</span></td>
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

          {jsonDiff.parseFailed ? (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Mudanças detectadas (fallback textual)</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 0 }}>
                Conteúdo JSON inválido. O diff abaixo mostra trechos reais alterados com destaque e linha. Motivo: {jsonDiff.parseFailureReason}
              </p>

              {jsonDiff.textDiff?.lineChanges?.length ? (
                <div style={{ marginBottom: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  {jsonDiff.textDiff.lineChanges.map((line, idx) => (
                    <div key={`line-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: '0.6rem', padding: '0.5rem 0.65rem' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.35rem' }}>
                        Linha base {line.lineBase ?? '-'} → alvo {line.lineTarget ?? '-'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff1f2', padding: '0.35rem', borderRadius: '0.35rem' }}>{line.before || '∅'}</code>
                        <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f0fdf4', padding: '0.35rem', borderRadius: '0.35rem' }}>{line.after || '∅'}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {jsonDiff.textDiff?.hasDifference ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Versão base (remoções em vermelho)</div>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block' }}>{renderTokens(jsonDiff.textDiff.baseTokens)}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Versão alvo (adições em verde)</div>
                    <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block' }}>{renderTokens(jsonDiff.textDiff.targetTokens)}</code>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#64748b', margin: 0 }}>Sem mudanças textuais detectadas nos trechos comparáveis.</p>
              )}
            </div>
          ) : null}

          {diffQuery.data.metadataChanges.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma diferença de metadados encontrada.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {diffQuery.data.metadataChanges.map((change) => (
                <div key={`${change.field}-${change.changeType}`} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{change.field}</strong><span className="badge badge--muted">{change.changeType}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Antes</div><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{change.before ?? '-'}</code></div>
                    <div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Depois</div><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{change.after ?? '-'}</code></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
