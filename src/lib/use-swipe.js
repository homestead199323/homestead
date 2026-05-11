import { useRef, useState } from "react";

/* ═══════════════════════════════════════════
   useSwipe — touch-only horizontal swipe hook

   Touch events only. Mouse/pointer interaction is untouched, so
   desktop click handlers keep working without changes.

   Pair with `SwipeableRow` from components/ui.jsx — wire one of
   onSwipeRight (mark-done style) or onSwipeLeft (delete style),
   or both. Vertical scroll wins if the user drags more vertically
   than horizontally — the row will not move.

   Returns:
     bind      — props to spread onto the moving element
     offset    — px translated (0 at rest, ±600 during commit slide-off)
     dragging  — true between touchstart and touchend (used to gate transitions)
     committed — "right" | "left" | null during the commit animation window
   ═══════════════════════════════════════════ */
export function useSwipe({ onSwipeRight, onSwipeLeft, threshold = 80, disabled = false } = {}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [committed, setCommitted] = useState(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef(null); // "h" | "v" | null

  const onTouchStart = (e) => {
    if (disabled) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    axis.current = null;
    setDragging(true);
  };

  const onTouchMove = (e) => {
    if (disabled) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // Lock to an axis after a small initial movement
    if (axis.current == null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      } else {
        return;
      }
    }

    if (axis.current === "h") {
      let off = dx;
      // Cap movement to a direction we have a handler for
      if (off > 0 && !onSwipeRight) off = 0;
      if (off < 0 && !onSwipeLeft) off = 0;
      // Resistance past threshold so the row feels rubbery, not unbounded
      if (off > threshold) off = threshold + (off - threshold) * 0.35;
      if (off < -threshold) off = -threshold + (off + threshold) * 0.35;
      setOffset(off);
    }
  };

  const onTouchEnd = () => {
    if (disabled) return;
    setDragging(false);

    if (axis.current === "h") {
      if (offset >= threshold && onSwipeRight) {
        setCommitted("right");
        setOffset(600);
        setTimeout(() => {
          try { onSwipeRight(); } catch (e) { /* swallow — caller handles errors */ }
          setOffset(0);
          setCommitted(null);
        }, 200);
      } else if (offset <= -threshold && onSwipeLeft) {
        setCommitted("left");
        setOffset(-600);
        setTimeout(() => {
          try { onSwipeLeft(); } catch (e) { /* swallow */ }
          setOffset(0);
          setCommitted(null);
        }, 200);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
    axis.current = null;
  };

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd },
    offset,
    dragging,
    committed,
  };
}
