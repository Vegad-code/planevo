export const MOTION = {
  // Card appearing on timeline (like Structured's task card entry)
  cardEnter: {
    initial: { opacity: 0, y: 8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring" as const, stiffness: 400, damping: 25, mass: 0.8 }
  },

  // Card being picked up for drag (Structured's "pop out" effect)
  cardLift: {
    scale: 1.03,
    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    zIndex: 100,
    transition: { type: "spring" as const, stiffness: 500, damping: 30 }
  },

  // Card dropping into new position
  cardDrop: {
    scale: 1,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transition: { type: "spring" as const, stiffness: 400, damping: 28 }
  },

  // View switching (day ↔ week ↔ month ↔ list)
  viewSwitch: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { type: "tween" as const, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
  },

  // Popover / modal overlay
  overlay: {
    initial: { opacity: 0, scale: 0.95, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 4 },
    transition: { type: "spring" as const, stiffness: 400, damping: 28 }
  },

  // Subtle micro-interactions (hover, checkbox)
  micro: { type: "tween" as const, duration: 0.15, ease: "easeOut" as const },

  // Date navigation (sliding between days)
  dateSlide: {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
    transition: { type: "tween" as const, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
  },

  // Completion animation (checkbox → strikethrough → fade)
  complete: {
    animate: { opacity: 0.4, textDecoration: "line-through" },
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

