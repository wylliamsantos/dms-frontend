import { useEffect, useMemo, useState } from 'react';

import { DmsDocumentSearchResponse } from '@/types/document';
import { useDocumentVersionDiff } from '@/hooks/useDocumentDetails';

interface VersionDiffPanelProps {
  documentId?: string;
  versions: DmsDocumentSearchResponse[];
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
      {diffQuery.isError ? (
        <p style={{ color: '#b91c1c' }}>Não foi possível comparar as versões selecionadas.</p>
      ) : null}

      {diffQuery.data ? (
        <>
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
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Comparação textual</h3>
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
