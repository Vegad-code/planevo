/** Pure layout math for the hero phone timeline — compact stack + slot dimensions. */

export const PHONE_WIDTH = 280;
export const PHONE_STATUS_BAR_HEIGHT = 24;
export const RAIL_HEADER = 38;
export const RAIL_PADDING_BOTTOM = 12;

export const TIMELINE_TICK_WIDTH = 46;
export const SLOT_AREA_LEFT = 50;
export const SLOT_AREA_WIDTH = PHONE_WIDTH - SLOT_AREA_LEFT - 14;
export const PILL_SLOT_WIDTH = SLOT_AREA_WIDTH - 4;

export const TRACK_LEFT = '17%';
export const TRACK_RIGHT = '17%';

/** Uniform task row height — marketing timeline stays tight, not time-proportional. */
export const SLOT_HEIGHT = 48;
/** Thin commitment divider between task rows. */
export const BLOCK_HEIGHT = 16;
export const SLOT_STEP = SLOT_HEIGHT + BLOCK_HEIGHT;

const DEFAULT_TASK_COUNT = 4;

export function compactBodyHeight(taskCount = DEFAULT_TASK_COUNT): number {
  if (taskCount <= 0) return 0;
  return taskCount * SLOT_HEIGHT + (taskCount - 1) * BLOCK_HEIGHT;
}

export const PHONE_CONTENT_HEIGHT = compactBodyHeight(DEFAULT_TASK_COUNT);

export function columnContentHeight(taskCount = DEFAULT_TASK_COUNT): number {
  return RAIL_HEADER + compactBodyHeight(taskCount) + RAIL_PADDING_BOTTOM;
}

export function phoneFrameHeight(taskCount = DEFAULT_TASK_COUNT): number {
  return PHONE_STATUS_BAR_HEIGHT + columnContentHeight(taskCount);
}

export function compactSlotTopY(order: number): number {
  return order * SLOT_STEP;
}

export function compactBlockTopY(afterOrder: number): number {
  return compactSlotTopY(afterOrder) + SLOT_HEIGHT;
}

export function slotTopY(order: number): number {
  return compactSlotTopY(order);
}

export function slotHeightPx(): number {
  return SLOT_HEIGHT;
}

export function slotCenterY(order: number): number {
  return compactSlotTopY(order) + SLOT_HEIGHT / 2;
}

export function blockTopY(afterOrder: number): number {
  return compactBlockTopY(afterOrder);
}

export function blockHeightPx(): number {
  return BLOCK_HEIGHT;
}

/** Negative translateY while pills stack above their slot during gather/drop. */
export function gatherDropOffset(dropFromY: number, order: number): number {
  return -(dropFromY + order * 8);
}

export function slotCenterFromPhoneTop(order: number): number {
  return PHONE_STATUS_BAR_HEIGHT + RAIL_HEADER + compactSlotTopY(order) + SLOT_HEIGHT / 2;
}

/** Y offset from phone vertical center to a slot center (hero-level coords). */
export function slotCenterRelativeToPhoneCenter(order: number, taskCount = DEFAULT_TASK_COUNT): number {
  return slotCenterFromPhoneTop(order) - phoneFrameHeight(taskCount) / 2;
}

/** Fallback deposit target Y from hero center (px) when intake ref unavailable. */
export const DEPOSIT_FALLBACK_Y = 300;

/** Horizontal offset from track anchor to slot pill center (px). */
export function slotCenterXRelativeToTrack(): number {
  return SLOT_AREA_LEFT + 2 + PILL_SLOT_WIDTH / 2 - PHONE_WIDTH / 2;
}

export function hourLabel(hour24: number): string {
  if (hour24 === 12) return '12 PM';
  if (hour24 === 0) return '12 AM';
  return hour24 < 12 ? `${hour24} AM` : `${hour24 - 12} PM`;
}
