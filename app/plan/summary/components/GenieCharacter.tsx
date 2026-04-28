'use client';

// Pure-CSS genie character, 64 × 118 px. Extracted from page.tsx as part
// of the summary-page split. The chat panel renders this beside the assistant
// reply when the model is speaking.

export function GenieCharacter({ speaking }: { speaking: boolean }) {
  const STAR = String.fromCodePoint(0x2736);
  return (
    <div style={{ position: 'relative', width: 64, height: 118, pointerEvents: 'none' }}>

      {/* Jewel */}
      <div style={{
        position: 'absolute', top: 0, left: 27, width: 10, height: 10,
        background: 'radial-gradient(circle at 35% 35%, #7dd3fc, #0ea5e9)',
        borderRadius: '50%', boxShadow: '0 0 8px 3px rgba(56,189,248,0.8)', zIndex: 5,
      }} />

      {/* Turban */}
      <div style={{
        position: 'absolute', top: 6, left: 10, width: 44, height: 20,
        background: 'linear-gradient(135deg, #fbbf24, #d97706)',
        borderRadius: '50% 50% 20% 20%', zIndex: 4,
        boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
      }}>
        <div style={{
          position: 'absolute', bottom: 4, left: 6, right: 6, height: 2,
          background: 'rgba(255,255,255,0.35)', borderRadius: 2,
        }} />
      </div>

      {/* Head */}
      <div style={{
        position: 'absolute', top: 20, left: 11, width: 42, height: 42,
        background: 'radial-gradient(circle at 40% 35%, #fde68a, #f59e0b)',
        borderRadius: '50%', zIndex: 3,
        boxShadow: '0 4px 12px rgba(251,191,36,0.3)',
      }}>
        {/* Left eye */}
        <div style={{ position: 'absolute', top: 12, left: 6, width: 13, height: 16, background: '#fff', borderRadius: '50%' }}>
          <div style={{ position: 'absolute', top: 3, left: 2, width: 8, height: 10, background: '#1d4ed8', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 2, left: 7, width: 4, height: 4, background: '#fff', borderRadius: '50%' }} />
        </div>
        {/* Right eye */}
        <div style={{ position: 'absolute', top: 12, right: 6, width: 13, height: 16, background: '#fff', borderRadius: '50%' }}>
          <div style={{ position: 'absolute', top: 3, left: 2, width: 8, height: 10, background: '#1d4ed8', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 2, left: 7, width: 4, height: 4, background: '#fff', borderRadius: '50%' }} />
        </div>
        {/* Cheeks */}
        <div style={{ position: 'absolute', top: 24, left: 2, width: 10, height: 6, background: 'rgba(251,113,133,0.45)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 24, right: 2, width: 10, height: 6, background: 'rgba(251,113,133,0.45)', borderRadius: '50%' }} />
        {/* Smile */}
        <div style={{
          position: 'absolute', bottom: 9, left: '50%', transform: 'translateX(-50%)',
          width: 16, height: 7, border: '2px solid #92400e',
          borderTop: 'none', borderRadius: '0 0 8px 8px',
        }} />
      </div>

      {/* Body */}
      <div style={{
        position: 'absolute', top: 56, left: 10, width: 44, height: 28,
        background: 'linear-gradient(180deg, #6d28d9, #4c1d95)',
        borderRadius: '12px 12px 8px 8px', zIndex: 2,
        boxShadow: '0 4px 14px rgba(109,40,217,0.5)',
      }}>
        {/* Belt */}
        <div style={{
          position: 'absolute', top: 8, left: 0, right: 0, height: 5,
          background: 'linear-gradient(90deg, #d97706, #fbbf24 50%, #d97706)',
        }} />
        {/* Left arm */}
        <div style={{
          position: 'absolute', top: 4, left: -12, width: 16, height: 7,
          background: '#5b21b6', borderRadius: 999, transform: 'rotate(22deg)',
        }} />
        {/* Right arm */}
        <div style={{
          position: 'absolute', top: 4, right: -12, width: 16, height: 7,
          background: '#5b21b6', borderRadius: 999, transform: 'rotate(-22deg)',
        }} />
      </div>

      {/* Tail segments */}
      {([36, 26, 16] as const).map((w, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 82 + i * 11,
          left: (64 - w) / 2,
          width: w,
          height: i === 2 ? 10 : 12,
          background: i === 0
            ? 'linear-gradient(180deg, #5b21b6, #4c1d95)'
            : i === 1
            ? 'linear-gradient(180deg, #4c1d95, #3b0764)'
            : 'linear-gradient(180deg, #3b0764, #2e1065)',
          borderRadius: i === 2 ? '0 0 10px 10px' : '0 0 6px 6px',
          zIndex: 1,
        }} />
      ))}

      {/* Speaking sparkles */}
      {speaking && (
        <>
          <span style={{ position: 'absolute', top: 8, right: -4, color: '#38bdf8', fontSize: 11, animation: 'genieSpark 1.1s ease-in-out infinite' }}>{STAR}</span>
          <span style={{ position: 'absolute', top: 40, left: -6, color: '#a78bfa', fontSize: 9, animation: 'genieSpark 0.9s ease-in-out infinite 0.4s' }}>{STAR}</span>
          <span style={{ position: 'absolute', bottom: 20, right: -8, color: '#fbbf24', fontSize: 13, animation: 'genieSpark 1.3s ease-in-out infinite 0.2s' }}>{STAR}</span>
        </>
      )}
    </div>
  );
}
