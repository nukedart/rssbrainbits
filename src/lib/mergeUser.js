// Keep the previous user object when nothing meaningful changed, so
// [user]-keyed effects don't re-run on TOKEN_REFRESHED / refocus SIGNED_IN.
export function mergeUser(prev, next) {
  if (!next) return null;
  if (!prev || prev.id !== next.id) return next;
  if (
    prev.updated_at === next.updated_at &&
    prev.email === next.email &&
    JSON.stringify(prev.user_metadata ?? null) === JSON.stringify(next.user_metadata ?? null) &&
    JSON.stringify(prev.app_metadata ?? null) === JSON.stringify(next.app_metadata ?? null)
  ) return prev;
  return next;
}
