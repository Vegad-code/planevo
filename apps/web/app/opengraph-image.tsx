import { ImageResponse } from 'next/og';

export const alt = 'Planevo — A plan that adapts.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFEB',
          backgroundImage:
            'radial-gradient(circle, rgba(28,27,23,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            color: '#706E64',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Planevo
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 96,
            color: '#1C1B17',
            letterSpacing: -3,
            display: 'flex',
            fontFamily: 'Georgia, serif',
          }}
        >
          A plan that&nbsp;
          <span style={{ fontStyle: 'italic', color: '#6395EE' }}>adapts.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: '#706E64', display: 'flex' }}>
          Planned into your real free time — for students.
        </div>
      </div>
    ),
    { ...size },
  );
}
