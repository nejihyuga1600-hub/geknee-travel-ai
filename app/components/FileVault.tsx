'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const TAG_LABELS: Record<string, string> = {
  passport:  '\uD83D\uDEC2 Passport',
  booking:   '\uD83C\uDFAB Booking',
  insurance: '\uD83D\uDEE1\uFE0F Insurance',
  photo:     '\uD83D\uDCF7 Photo',
  other:     '\uD83D\uDCC4 Other',
};

const TAG_COLORS: Record<string, string> = {
  passport:  'rgba(99,102,241,0.25)',
  booking:   'rgba(14,165,233,0.25)',
  insurance: 'rgba(234,179,8,0.25)',
  photo:     'rgba(236,72,153,0.25)',
  other:     'rgba(255,255,255,0.1)',
};

interface TripFile {
  id: string; name: string; url: string; size: number; tag: string; createdAt: string;
  user: { name: string | null; image: string | null };
}

function fmtSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileVault({ tripId, currentUserId }: { tripId: string; currentUserId: string }) {
  const [files,      setFiles]      = useState<TripFile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [filterTag,  setFilterTag]  = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('other');
  const [error,      setError]      = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/trips/${tripId}/files`);
      const data = await res.json() as { files: TripFile[] };
      setFiles(data.files ?? []);
    } finally { setLoading(false); }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('tag', selectedTag);
      const res  = await fetch(`/api/trips/${tripId}/files`, { method: 'POST', body: form });
      const data = await res.json() as { file?: TripFile; error?: string };
      if (data.error) { setError(data.error); return; }
      if (data.file)  setFiles(prev => [data.file!, ...prev]);
    } catch { setError('Upload failed — check your connection.'); }
    finally  { setUploading(false); }
  }, [tripId, selectedTag]);

  const handleDelete = useCallback(async (fileId: string) => {
    await fetch(`/api/trips/${tripId}/files/${fileId}`, { method: 'DELETE' });
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, [tripId]);

  const displayed = filterTag === 'all' ? files : files.filter(f => f.tag === filterTag);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Upload row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedTag}
          onChange={e => setSelectedTag(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '7px 10px', outline: 'none',
          }}
        >
          {Object.entries(TAG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            flex: 1, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
            background: uploading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}
        >
          {uploading ? 'Uploading...' : '\u2B06\uFE0F Upload file'}
        </button>
      </div>

      {error && <div style={{ fontSize: 11, color: '#f87171' }}>{error}</div>}

      {/* Tag filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(TAG_LABELS)].map(t => (
          <button key={t} onClick={() => setFilterTag(t)} style={{
            padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11,
            background: filterTag === t ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
            color: filterTag === t ? '#a78bfa' : 'rgba(255,255,255,0.45)', fontWeight: filterTag === t ? 700 : 400,
          }}>
            {t === 'all' ? 'All' : TAG_LABELS[t]}
          </button>
        ))}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Loading...</p>}
        {!loading && displayed.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
            No files yet.{'\n'}Upload passports, bookings, or photos to share with your group.
          </p>
        )}
        {displayed.map(f => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.05)', borderRadius: 10,
            padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: TAG_COLORS[f.tag] ?? TAG_COLORS.other,
              color: '#e2e8f0', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {TAG_LABELS[f.tag] ?? f.tag}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a href={f.url} target="_blank" rel="noreferrer" style={{
                color: '#a5b4fc', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {f.name}
              </a>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                {fmtSize(f.size)} &middot; {f.user.name ?? 'You'}
              </span>
            </div>
            {f.user && currentUserId && (
              <button
                onClick={() => handleDelete(f.id)}
                title="Delete"
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', fontSize: 14, lineHeight: 1, flexShrink: 0,
                }}
              >
                {String.fromCodePoint(0x1F5D1)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
