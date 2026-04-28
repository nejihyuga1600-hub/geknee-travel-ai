'use client';

import { type ReactNode } from 'react';

// Inline markdown renderer — handles **bold** and *italic* runs inside a
// single line. Extracted from page.tsx as part of the summary-page split.

export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const bold = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/);
    if (bold) {
      if (bold[1]) parts.push(<span key={key++}>{bold[1]}</span>);
      parts.push(<strong key={key++} style={{ color: '#e2e8f0' }}>{bold[2]}</strong>);
      remaining = bold[3];
      continue;
    }
    const italic = remaining.match(/^(.*?)\*(.+?)\*(.*)/);
    if (italic) {
      if (italic[1]) parts.push(<span key={key++}>{italic[1]}</span>);
      parts.push(<em key={key++} style={{ color: '#cbd5e1' }}>{italic[2]}</em>);
      remaining = italic[3];
      continue;
    }
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith('### ')) return (
    <h3 style={{ color: '#a5b4fc', fontSize: 15, fontWeight: 600, marginTop: 14, marginBottom: 4 }}>
      {line.slice(4)}
    </h3>
  );
  if (line.startsWith('# ')) return (
    <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>{line.slice(2)}</h1>
  );
  if (line.startsWith('- ') || line.startsWith('* ')) return (
    <li style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 4, marginLeft: 16, listStyle: 'disc' }}>
      {renderInline(line.slice(2))}
    </li>
  );
  if (/^\d+\.\s/.test(line)) return (
    <li style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 4, marginLeft: 16 }}>
      {renderInline(line.replace(/^\d+\.\s/, ''))}
    </li>
  );
  if (!line.trim()) return <div style={{ height: 8 }} />;
  return (
    <p style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, marginBottom: 4 }}>
      {renderInline(line)}
    </p>
  );
}
