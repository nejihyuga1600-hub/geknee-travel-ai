'use client';
import { useEffect, useState } from 'react';

// Manual install entry for SettingsPanel. Hides when the app is already
// running standalone — re-installing isn't a thing. Clicking dispatches a
// window event that InstallPrompt picks up; centralizing the install UX in
// one component keeps iOS/Android branching in a single place.
export default function InstallEntry() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const display = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    setAvailable(!(ios || display));
  }, []);

  if (!available) return null;

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('geknee:show-install'))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        background: 'rgba(167, 139, 250, 0.08)',
        border: '1px solid rgba(167, 139, 250, 0.25)',
        borderRadius: 12,
        padding: '12px 14px',
        color: '#f5f1e8',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'left',
        marginTop: 12,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </svg>
      <div style={{ flex: 1 }}>
        <div>Install geknee</div>
        <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 400, marginTop: 2 }}>
          Add to home screen — opens like a real app
        </div>
      </div>
    </button>
  );
}
