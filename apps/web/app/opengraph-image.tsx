import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Planevo — Your week, handled.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const fraunces = await readFile(
    join(process.cwd(), 'assets/fonts/Fraunces-SemiBold.ttf'),
  );

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
          backgroundColor: '#FFFDF5',
          backgroundImage:
            'radial-gradient(circle, rgba(27,28,21,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            color: '#6B6C61',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Planevo
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: 'Fraunces',
            fontSize: 110,
            color: '#1B1C15',
            letterSpacing: -3,
            display: 'flex',
          }}
        >
          Your week,&nbsp;
          <span style={{ fontStyle: 'italic', color: '#B96E2A' }}>handled.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: '#6B6C61', display: 'flex' }}>
          Your plate, planned into your real free time.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Fraunces', data: fraunces, style: 'normal', weight: 600 }],
    },
  );
}
