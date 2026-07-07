/** Blur background paths for marketing demos. */
export const MARKETING_BLUR_IMAGES = {
  capture: '/landing/bg/features-capture.webp',
  board: '/landing/bg/features-board.webp',
  plan: '/landing/bg/features-plan.webp',
  command: '/landing/bg/features-command.webp',
  calendar: '/landing/bg/features-calendar.webp',
  tasks: '/landing/bg/features-tasks.webp',
  notes: '/landing/bg/features-notes.webp',
  about: '/landing/bg/about-hero.webp',
  footer: '/landing/bg/footer-cinematic.webp',
  default: '/landing/bg/features-command.webp',
} as const;

export type MarketingBlurKey = keyof typeof MARKETING_BLUR_IMAGES;
