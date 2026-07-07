import { HERO_SLOT_SPRING } from '@/lib/calendar/motion';

export { HERO_SLOT_SPRING };

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

/**
 * Deterministic under-damped step response — scroll-scrubbable in both directions.
 * Returns 0 → 1 with brief overshoot past 1 when under-damped.
 */
export function springResponse(t: number, spring: SpringConfig = HERO_SLOT_SPRING): number {
  const clamped = Math.min(1, Math.max(0, t));
  const { stiffness, damping, mass } = spring;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  const settleTime = 3.2 / omega0;
  const time = clamped * settleTime;

  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * time);
    return (
      1 -
      envelope *
        (Math.cos(omegaD * time) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * time))
    );
  }

  return 1 - Math.exp(-omega0 * time);
}

function easeOutQuint(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 5;
}

/** Vertical drop with spring overshoot (~4–8px at hero scale). */
export function springDropY(
  progress: number,
  landStart: number,
  landEnd: number,
  fromY: number,
  toY: number,
): number {
  if (progress <= landStart) return fromY;
  if (progress >= landEnd) return toY;
  const t = (progress - landStart) / Math.max(0.001, landEnd - landStart);
  const response = springResponse(t);
  return fromY + (toY - fromY) * response;
}

/** Scale pop on land: 0.94 → 1.05 → 1.0 */
export function springScale(progress: number, landStart: number, landEnd: number): number {
  if (progress <= landStart) return 0.94;
  if (progress >= landEnd) return 1;
  const t = (progress - landStart) / Math.max(0.001, landEnd - landStart);

  if (t < 0.65) {
    const local = t / 0.65;
    const response = springResponse(local);
    return 0.94 + (1.05 - 0.94) * Math.min(response, 1.08);
  }

  const local = (t - 0.65) / 0.35;
  return 1.05 - 0.05 * easeOutQuint(local);
}

/** Dashed slot well → solid pill fill (0 = dashed only, 1 = solid). */
export function slotFill(progress: number, landStart: number, landEnd: number): number {
  if (progress <= landStart) return 0;
  if (progress >= landEnd) return 1;
  const t = (progress - landStart) / Math.max(0.001, landEnd - landStart);
  return easeOutQuint(t);
}

/** Per-pill land window — sequential cascade during organize phase. */
export function pillLandWindow(
  order: number,
  trackCount: number,
  gatherEnd: number,
  organizeEnd: number,
): { landStart: number; landEnd: number } {
  const phaseSpan = organizeEnd - gatherEnd;
  const slotSpan = phaseSpan / trackCount;
  const landStart = gatherEnd + slotSpan * order;
  const landEnd = landStart + slotSpan * 0.88;
  return { landStart, landEnd };
}
