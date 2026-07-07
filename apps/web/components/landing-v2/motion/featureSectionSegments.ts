/** Map feature section ids to stack segment index (server-safe — no hooks). */
export function featureSectionSegment(id: string): number {
  switch (id) {
    case 'capture':
      return 0;
    case 'board':
      return 1;
    case 'plan':
      return 2;
    default:
      return 0;
  }
}

export const FEATURE_SEGMENT_COUNT = 3;
