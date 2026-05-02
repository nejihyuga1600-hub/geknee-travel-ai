'use client';

// Per-section 7-day weather strip. Extracted from page.tsx as part of the
// summary-page split. The DayWeather shape mirrors what /api/weather emits.

export interface DayWeather {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
  iconUrl: string;
  pop: number;
}

export function WeatherBar({ days, unit }: { days: DayWeather[]; unit: 'C' | 'F' }) {
  function toDisplay(c: number) {
    return unit === 'F' ? Math.round(c * 9 / 5 + 32) : c;
  }
  return (
    <div style={{
      display: 'flex', gap: 10, overflowX: 'auto',
      paddingBottom: 4, marginBottom: 4,
    }}>
      {days.slice(0, 7).map(d => {
        const date = new Date(d.date + 'T12:00:00');
        const wkday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        return (
          <div key={d.date} style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 16px',
            minWidth: 110, gap: 4,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
              letterSpacing: '0.16em', whiteSpace: 'nowrap',
            }}>
              {wkday} {dayNum}
            </span>
            <img src={d.iconUrl} alt={d.condition} style={{ width: 44, height: 44, margin: '2px 0' }} />
            <span style={{
              fontSize: 15, fontWeight: 700, color: '#7dd3fc',
              whiteSpace: 'nowrap', letterSpacing: '0.01em',
            }}>
              {toDisplay(d.tempMax)}&deg; / {toDisplay(d.tempMin)}&deg;
            </span>
            <span style={{
              fontSize: 10.5, color: 'rgba(255,255,255,0.5)',
              textAlign: 'center', lineHeight: 1.3,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {d.condition}
              {d.pop > 0.2 && (
                <span style={{ color: '#93c5fd' }}>
                  · {String.fromCodePoint(0x2614)} {Math.round(d.pop * 100)}%
                </span>
              )}
            </span>
          </div>
        );
      })}
      {days.length === 0 && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>
          Weather unavailable
        </span>
      )}
    </div>
  );
}
