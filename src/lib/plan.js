// ── Plan / tier system ────────────────────────────────────────
// Tiers are stored in Supabase user_metadata.plan (set via Supabase dashboard
// or a future Stripe webhook). Default is "free".
//
// To upgrade a user manually in Supabase SQL editor:
//   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"plan":"pro"}'
//   WHERE email = 'user@example.com';

export const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    feeds: 10,
    smartFeeds: 3,
    folders: 2,
    readLater: 25,
    aiSummaries: 5,       // per day
    fullTextFetch: false,
    exportData: true,
    readingStats: false,
    highlights: true,
  },
  pro: {
    name: "Pro",
    price: "$5/mo",
    feeds: Infinity,
    smartFeeds: Infinity,
    folders: Infinity,
    readLater: Infinity,
    aiSummaries: Infinity,
    fullTextFetch: true,
    exportData: true,
    readingStats: true,
    highlights: true,
  },
};

export function getPlan(user) {
  if (!user) return PLANS.free;
  const plan = user.user_metadata?.plan;
  return PLANS[plan] || PLANS.free;
}

export function getPlanName(user) {
  if (!user) return "free";
  return user.user_metadata?.plan || "free";
}

export function isProUser(user) {
  return getPlanName(user) === "pro";
}

// Returns { allowed: bool, reason: string }
export function checkLimit(user, resource, currentCount) {
  const plan = getPlan(user);
  const limit = plan[resource];
  if (limit === Infinity || limit === true) return { allowed: true };
  if (typeof limit === "number" && currentCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached the ${PLANS.free.name} limit of ${limit} ${resource}. Upgrade to Pro for unlimited access.`,
      limit,
    };
  }
  return { allowed: true };
}
