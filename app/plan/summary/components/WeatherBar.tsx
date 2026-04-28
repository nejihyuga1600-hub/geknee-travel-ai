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
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, marginTop: 4 }}>
      {days.slice(0, 7).map(d => (
        <div key={d.date} style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: 10, padding: '6px 10px', minWidth: 72,
        }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 1, whiteSpace: 'nowrap' }}>
            {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <img src={d.iconUrl} alt={d.condition} style={{ width: 34, height: 34 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7dd3fc', whiteSpace: 'nowrap' }}>
            {toDisplay(d.tempMax)}&deg;&thinsp;/&thinsp;{toDisplay(d.tempMin)}&deg;{unit}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 1, lineHeight: 1.3 }}>
            {d.condition}
          </span>
          {d.pop > 0.2 && (
            <span style={{ fontSize: 9, color: '#93c5fd', marginTop: 2 }}>
              {String.fromCodePoint(0x1F4A7)} {Math.round(d.pop * 100)}%
            </span>
          )}
        </div>
      ))}
      {days.length === 0 && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>
          Weather unavailable
        </span>
      )}
    </div>
  );
}
