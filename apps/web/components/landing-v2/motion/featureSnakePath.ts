import {
  FEATURE_STREAM_GLYPHS,
  INTEGRATION_STREAM_GLYPHS,
  type FeatureStreamGlyph,
} from './featureStreamGlyphs';

export interface Point {
  x: number;
  y: number;
}

export interface TrailSlot {
  glyph: FeatureStreamGlyph;
  prominent: boolean;
  phase: number;
}

const PATH_SAMPLES = 96;
const ICON_COUNT = 14;
const ICON_SPACING = 0.055;

/** Full-width snake — layering keeps it behind copy and demo cards. */
const BASE_WAYPOINTS: Point[] = [
  { x: 0.1, y: 0.02 },
  { x: 0.74, y: 0.11 },
  { x: 0.86, y: 0.24 },
  { x: 0.16, y: 0.36 },
  { x: 0.08, y: 0.5 },
  { x: 0.8, y: 0.62 },
  { x: 0.22, y: 0.76 },
  { x: 0.72, y: 0.88 },
  { x: 0.48, y: 0.98 },
];

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export function buildSnakeSamples(seed: number): Point[] {
  const rand = mulberry32(seed);
  const jittered = BASE_WAYPOINTS.map((point) => ({
    x: Math.min(0.94, Math.max(0.06, point.x + (rand() - 0.5) * 0.08)),
    y: Math.min(0.99, Math.max(0.01, point.y + (rand() - 0.5) * 0.03)),
  }));

  const points: Point[] = [];
  const segmentCount = jittered.length - 1;
  const perSegment = Math.ceil(PATH_SAMPLES / segmentCount);

  for (let s = 0; s < segmentCount; s += 1) {
    const p0 = jittered[s];
    const p3 = jittered[s + 1];
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const p1 = { x: p0.x + dx * 0.38, y: p0.y + dy * 0.08 };
    const p2 = { x: p3.x - dx * 0.38, y: p3.y - dy * 0.08 };

    for (let i = 0; i < perSegment; i += 1) {
      if (s > 0 && i === 0) continue;
      points.push(cubicPoint(p0, p1, p2, p3, i / (perSegment - 1)));
    }
  }

  return points;
}

export function pointAtProgress(samples: Point[], t: number): Point {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (samples.length - 1);
  const index = Math.floor(scaled);
  const frac = scaled - index;
  const a = samples[index];
  const b = samples[Math.min(index + 1, samples.length - 1)];
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  };
}

export function iconOpacity(t: number): number {
  if (t < 0.02) return t / 0.02;
  if (t > 0.98) return (1 - t) / 0.02;
  return 1;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function buildTrailSlots(seed: number, direction: 'up' | 'down'): TrailSlot[] {
  const rand = mulberry32(seed);
  const integrationCount = 6;
  const featureCount = ICON_COUNT - integrationCount;

  const integrations = shuffle(INTEGRATION_STREAM_GLYPHS, rand);
  const features = shuffle(FEATURE_STREAM_GLYPHS, rand);

  const slots: TrailSlot[] = [];

  for (let i = 0; i < integrationCount; i += 1) {
    slots.push({
      glyph: integrations[i % integrations.length],
      prominent: true,
      phase: 0,
    });
  }

  for (let i = 0; i < featureCount; i += 1) {
    slots.push({
      glyph: features[i % features.length],
      prominent: false,
      phase: 0,
    });
  }

  const shuffled = shuffle(slots, rand);
  const phaseStep = direction === 'down' ? ICON_SPACING : -ICON_SPACING;

  return shuffled.map((slot, index) => ({
    ...slot,
    phase: index * phaseStep,
  }));
}

export { ICON_COUNT, PATH_SAMPLES };
