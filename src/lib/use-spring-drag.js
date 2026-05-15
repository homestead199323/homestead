/**
 * useSpringDrag — spring physics for draggable elements
 *
 * Returns a motionValue + dragControls config for Framer Motion.
 * Use with <motion.div drag dragControls={controls} style={{x,y}} />.
 *
 * Spring presets tuned for:
 *   "zone"   — heavier, slower (farm map zones, large elements)
 *   "card"   — medium (crop cards snapping back)
 *   "sheet"  — fast snap for bottom-sheet dismiss gesture
 *   "swipe"  — snappy, tight (swipe-to-complete rows)
 */

export const SPRING = {
  zone: {
    type: "spring",
    stiffness: 260,
    damping: 28,
    mass: 1.2,
  },
  card: {
    type: "spring",
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  },
  sheet: {
    type: "spring",
    stiffness: 500,
    damping: 40,
    mass: 0.6,
  },
  swipe: {
    type: "spring",
    stiffness: 600,
    damping: 38,
    mass: 0.5,
  },
};

/**
 * Layout animation config for shared-element transitions (layoutId).
 * Pass as `transition` prop on motion elements that use layoutId.
 */
export const LAYOUT_SPRING = {
  type: "spring",
  stiffness: 400,
  damping: 36,
  mass: 0.7,
};
