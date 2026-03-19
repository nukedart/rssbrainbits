// ── useSwipe — reusable touch gesture hook ──────────────────
// Returns ref to attach to any element.
// Calls onSwipeLeft / onSwipeRight / onSwipeDown when threshold met.
// threshold: min px to count as a swipe (default 60)
// edgeOnly: only trigger if swipe started within edgePx from left edge

import { useRef } from "react";

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  threshold = 60,
  edgeOnly = false,
  edgePx = 30,
  velocityThreshold = 0.3, // px/ms
} = {}) {
  const touch = useRef(null);

  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now(),
      edgeStart: t.clientX <= edgePx,
    };
  }

  function onTouchEnd(e) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.startX;
    const dy = t.clientY - touch.current.startY;
    const dt = Date.now() - touch.current.startTime;
    const velocity = Math.abs(dx) / dt;

    // Must be more horizontal than vertical
    if (Math.abs(dx) < Math.abs(dy) * 1.2) {
      // Check for swipe down
      if (dy > threshold && onSwipeDown) onSwipeDown();
      touch.current = null;
      return;
    }

    const valid = Math.abs(dx) > threshold || velocity > velocityThreshold;
    if (!valid) { touch.current = null; return; }

    if (dx > 0 && onSwipeRight) {
      if (edgeOnly && !touch.current.edgeStart) { touch.current = null; return; }
      onSwipeRight();
    } else if (dx < 0 && onSwipeLeft) {
      onSwipeLeft();
    }
    touch.current = null;
  }

  return { onTouchStart, onTouchEnd };
}
