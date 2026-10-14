import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════
   useSwipeUp — touch-only vertical swipe-up hook

   Sibling to useSwipe (which is horizontal-only). Fires onSwipeUp
   when the user drags upward past `threshold` pixels. Horizontal
   motion wins if the user drags more horizontally than vertically —
   the gesture is abandoned.

   Built for the Walk overlay's "swipe up to complete this task".

   Pair with `touchAction: "none"` on the swipeable element so the
   browser doesn't try to scroll while the user is swiping.

   Returns:
     bind     — props to spread onto the touchable element
     offsetY  — px translated (0 at rest, negative while dragging up)
     dragging — true between touchstart and touchend
   ═══════════════════════════════════════════ */
export function useSwipeUp({ onSwipeUp, threshold = 80, disabled = false } = {}) {
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef(null); // "h" | "v" | null
  const commitTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, []);

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
        axis.current = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
      } else {
        return;
      }
    }

    if (axis.current === "v" && dy < 0) {
      // Drag up only — negative dy
      let off = dy;
      // Rubbery resistance past threshold
      if (off < -threshold) off = -threshold + (off + threshold) * 0.35;
      setOffsetY(off);
    }
  };

  const onTouchEnd = () => {
    if (disabled) return;
    setDragging(false);

    if (axis.current === "v" && offsetY <= -threshold && onSwipeUp) {
      // Commit: slide out and fire callback
      setOffsetY(-400);
      commitTimer.current = setTimeout(() => {
        try { onSwipeUp(); } catch (e) { /* swallow — caller handles */ }
        setOffsetY(0);
        commitTimer.current = null;
      }, 180);
    } else {
      setOffsetY(0);
    }
    axis.current = null;
  };

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd },
    offsetY,
    dragging,
  };
}
