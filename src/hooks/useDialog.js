import { useEffect, useRef } from "react";

export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Pure: given ordered focusable items and the current element, return the element
// Tab/Shift+Tab should wrap to, or null if the browser's default move is fine.
export function nextTabTarget(items, current, shift) {
  if (!items.length) return null;
  const first = items[0], last = items[items.length - 1];
  const idx = items.indexOf(current);
  if (idx === -1) return shift ? last : first;
  if (shift && current === first) return last;
  if (!shift && current === last) return first;
  return null;
}

function focusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => !el.hidden && el.getAttribute("aria-hidden") !== "true");
}

const stack = [];

/**
 * Modal behaviour: initial focus, Tab trap, Escape -> onClose (top dialog only),
 * focus restore on close/unmount.
 */
export function useDialog(ref, { onClose, active = true } = {}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const token = {};
    stack.push(token);
    const prev = document.activeElement;
    if (!root.contains(document.activeElement)) {
      const first = focusables(root)[0];
      if (first) first.focus();
      else { if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1"); root.focus(); }
    }
    function onKey(e) {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape") {
        if (e.defaultPrevented) return;
        e.stopPropagation();
        closeRef.current?.();
      } else if (e.key === "Tab") {
        const target = nextTabTarget(focusables(root), document.activeElement, e.shiftKey);
        if (target) { e.preventDefault(); target.focus(); }
        else if (!root.contains(document.activeElement)) { e.preventDefault(); (focusables(root)[0] || root).focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(token);
      if (i !== -1) stack.splice(i, 1);
      if (prev && prev.isConnected && typeof prev.focus === "function") prev.focus();
    };
  }, [ref, active]);
}
