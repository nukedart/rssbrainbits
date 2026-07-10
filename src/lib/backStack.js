// ── backStack — makes the Android/PWA back button close overlays ───────────
// Without this, pressing back while an article, drawer, or modal is open
// exits the app instead of closing the topmost surface (no popstate handling
// existed anywhere in the app previously).
//
// Each open overlay pushes a dummy history entry and registers a close
// callback on a shared stack. Back button (or edge-swipe-back) pops the
// topmost entry and closes only the topmost overlay — closing overlays by
// other means (X button, Escape) consumes their entry via history.back()
// without re-triggering the popstate handler.

const stack = [];
let ignorePops = 0;
let listenerAdded = false;

function onPopState() {
  if (ignorePops > 0) { ignorePops--; return; }
  const close = stack.pop();
  if (close) close();
}

function ensureListener() {
  if (listenerAdded) return;
  listenerAdded = true;
  window.addEventListener("popstate", onPopState);
}

export function pushBackEntry(onClose) {
  ensureListener();
  window.history.pushState({ fbOverlay: true }, "");
  stack.push(onClose);
}

export function popBackEntry(onClose) {
  const idx = stack.lastIndexOf(onClose);
  if (idx === -1) return; // already consumed via popstate (user pressed back)
  stack.splice(idx, 1);
  ignorePops++;
  window.history.back();
}
