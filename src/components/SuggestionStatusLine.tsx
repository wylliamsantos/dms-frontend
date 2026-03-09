interface SuggestionStatusLineProps {
  text?: string;
  color?: string;
}

export function SuggestionStatusLine({ text, color = '#94a3b8' }: SuggestionStatusLineProps) {
  return (
    <div style={{ minHeight: '1.2rem' }}>
      <span style={{ fontSize: '0.8rem', color }}>
        {text?.trim() ? text : '\u00a0'}
      </span>
    </div>
  );
}
