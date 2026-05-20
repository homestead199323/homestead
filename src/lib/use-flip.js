/**
 * useFlip — lightweight FLIP animation hook
 *
 * Usage:
 *   const { snapshot, flip } = useFlip();
 *
 *   // Before state change: snapshot the element you want to animate FROM
 *   snapshot(key, domRef.current);
 *
 *   // After state change + React re-render: call flip(key, newDomRef.current)
 *   // The element will appear to fly from the old position to the new one.
 *
 * How it works:
 *   F — First:  record the element's getBoundingClientRect() before the change
 *   L — Last:   after React renders the new position, read getBoundingClientRect() again
 *   I — Invert: apply a CSS transform so the element visually sits at First
 *   P — Play:   remove the transform with a transition so it animates to Last
 *
 * Honors prefers-reduced-motion: skips the transform, just shows the element in place.
 */

import { useRef, useCallback } from "react";

const DURATION = 320; // ms
const EASING   = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // ease-out-quad

export function useFlip() {
  // Map of key → { top, left, width, height }
  const rects = useRef({});

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * snapshot(key, el)
   * Call BEFORE the state change that will move the element.
   * el: the DOM node to capture (can be null — snapshot is a no-op).
   */
  const snapshot = useCallback((key, el) => {
    if (!el) return;
    rects.current[key] = el.getBoundingClientRect();
  }, []);

  /**
   * flip(key, el)
   * Call AFTER React has re-rendered and the element is in its new position.
   * el: the DOM node in its new location.
   * If no snapshot exists for key, this is a no-op.
   */
  const flip = useCallback((key, el) => {
    if (!el || !rects.current[key]) return;
    if (prefersReducedMotion()) { delete rects.current[key]; return; }

    const first = rects.current[key];
    const last  = el.getBoundingClientRect();
    delete rects.current[key];

    const dx = first.left - last.left;
    const dy = first.top  - last.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return; // already in place

    // Invert: jump to First position instantly (no transition)
    el.style.transition = "none";
    el.style.transform  = `translate(${dx}px, ${dy}px)`;
    el.style.opacity    = "0.7";

    // Force a reflow so the browser registers the Invert state.
    void el.offsetHeight;

    // Play: animate to Last (natural position)
    el.style.transition = `transform ${DURATION}ms ${EASING}, opacity ${DURATION}ms ease`;
    el.style.transform  = "translate(0, 0)";
    el.style.opacity    = "1";

    // Clean up inline styles after animation ends
    const cleanup = () => {
      el.style.transition = "";
      el.style.transform  = "";
      el.style.opacity    = "";
    };
    el.addEventListener("transitionend", cleanup, { once: true });
  }, []);

  return { snapshot, flip };
}
