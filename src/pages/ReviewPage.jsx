// ── ReviewPage — Readwise-style daily highlight review ────────
// SM-2 scheduling stored in localStorage. No new tables needed.
import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getAllHighlights } from "../lib/supabase";
import { Spinner } from "../components/UI";

// ── SM-2 helpers ───────────────────────────────────────────────
const MIN_EASE = 1.3;
const DAILY_LIMIT = 5; // Readwise-style: small daily habit

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isDue(entry) {
  if (!entry) return true;
  return entry.nextReview <= todayStr();
}

function rate(entry, rating) {
  // rating: 0=Forgot, 1=Remember, 2=Easy
  const ease = Math.max(MIN_EASE, (entry?.ease ?? 2.5) + (rating === 2 ? 0.1 : rating === 0 ? -0.2 : 0));
  const interval = rating === 0
    ? 1
    : Math.max(1, Math.round((entry?.interval ?? 1) * (rating === 2 ? ease * 1.3 : ease)));
  return { ease, interval, nextReview: addDays(todayStr(), interval) };
}

function loadSchedule(userId) {
  try { return JSON.parse(localStorage.getItem(`fb-sr-${userId}`) || "{}"); }
  catch { return {}; }
}

function saveSchedule(userId, s) {
  localStorage.setItem(`fb-sr-${userId}`, JSON.stringify(s));
}

// ── Color strip map ────────────────────────────────────────────
const COLOR_STRIP = { yellow: "#f6c843", blue: "#60a5fa", green: "#4ade80", purple: "#c084fc" };

export default function ReviewPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState({});
  const [queueIdx, setQueueIdx] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [swipeState, setSwipeState] = useState(null); // "left" | "right" | null
  const touchStartX = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setSchedule(loadSchedule(user.id));
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const queue = useMemo(
    () => highlights.filter(h => isDue(schedule[h.id])).slice(0, DAILY_LIMIT),
    [highlights, schedule]
  );

  const current = queue[queueIdx];
  const done = !loading && queueIdx >= queue.length;
  const total = queue.length;
  const progress = total > 0 ? queueIdx / total : 1;

  function handleRating(rating) {
    if (!current || !user) return;
    const updated = { ...schedule, [current.id]: rate(schedule[current.id], rating) };
    setSchedule(updated);
    saveSchedule(user.id, updated);
    setSwipeState(null);
    setQueueIdx(i => i + 1);
    setSessionCount(n => n + 1);
  }

  // ── Swipe gesture ──────────────────────────────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchMove(e) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 30) setSwipeState(dx > 0 ? "right" : "left");
  }

  function onTouchEnd() {
    if (swipeState === "right") handleRating(1);      // Remember
    else if (swipeState === "left") handleRating(0);  // Forgot
    else setSwipeState(null);
    touchStartX.current = null;
  }

  // ── Next review date label ─────────────────────────────────
  function nextLabel(rating) {
    const s = rate(schedule[current?.id], rating);
    if (s.interval === 1) return "tomorrow";
    if (s.interval < 7) return `${s.interval}d`;
    if (s.interval < 30) return `${Math.round(s.interval / 7)}w`;
    return `${Math.round(s.interval / 30)}mo`;
  }

  const centerStyle = {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: T.bg, padding: "24px 16px",
  };

  if (loading) return <div style={centerStyle}><Spinner size={28} /></div>;

  if (highlights.length === 0) {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 36, marginBottom: 16, color: T.accent }}>✦</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>No highlights yet</div>
        <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
          Select text while reading to create a card. Your highlights will appear here for daily review.
        </div>
      </div>
    );
  }

  if (done) {
    const dueTomorrow = highlights.filter(h => {
      const s = schedule[h.id];
      return s && s.nextReview === addDays(todayStr(), 1);
    }).length;
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>
          {sessionCount > 0 ? `${sessionCount} reviewed` : "All caught up!"}
        </div>
        <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 4 }}>
          {sessionCount > 0
            ? `You reviewed ${sessionCount} highlight${sessionCount !== 1 ? "s" : ""} today.`
            : "Nothing due right now — come back tomorrow."}
        </div>
        {dueTomorrow > 0 && (
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 8 }}>
            {dueTomorrow} due tomorrow · {highlights.length} total cards
          </div>
        )}
      </div>
    );
  }

  const stripColor = COLOR_STRIP[current.color] || COLOR_STRIP.yellow;
  const swipeOpacity = swipeState ? 0.85 : 1;
  const swipeTranslate = swipeState === "right" ? "translateX(8px)" : swipeState === "left" ? "translateX(-8px)" : "none";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0, userSelect: "none" }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: T.border, flexShrink: 0 }}>
        <div style={{ height: 3, width: `${progress * 100}%`, background: T.accent, transition: "width .4s ease" }} />
      </div>

      {/* Header */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.textTertiary }}>
          Daily Review
        </div>
        <div style={{ fontSize: 12, color: T.textTertiary }}>
          {queueIdx + 1} of {total}
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 16px 8px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{
          width: "100%", maxWidth: 560,
          background: T.card, borderRadius: 18,
          border: `1px solid ${swipeState === "right" ? T.accent : swipeState === "left" ? T.danger || T.border : T.border}`,
          boxShadow: "0 4px 32px rgba(0,0,0,.09)",
          overflow: "hidden",
          opacity: swipeOpacity,
          transform: swipeTranslate,
          transition: "transform .1s, border-color .15s, opacity .1s",
        }}>
          {/* Color strip */}
          <div style={{ height: 4, background: stripColor }} />

          <div style={{ padding: "28px 28px 24px" }}>
            {/* Passage */}
            <div style={{
              fontSize: 18, lineHeight: 1.7, color: T.text,
              fontStyle: "italic", marginBottom: 20,
              fontFamily: "var(--font-serif, Georgia, serif)",
            }}>
              "{current.passage}"
            </div>

            {/* Annotation — the back of the card */}
            {current.note && (
              <div style={{
                fontSize: 14, color: T.textSecondary, lineHeight: 1.6,
                borderLeft: `3px solid ${stripColor}`, paddingLeft: 14,
                marginBottom: 16,
              }}>
                {current.note}
              </div>
            )}

            {/* Tags */}
            {current.tags?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {current.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20,
                    background: T.accentSurface, color: T.accent,
                    border: `1px solid ${T.accent}33`,
                    fontWeight: 600, letterSpacing: ".03em",
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Source */}
            <div style={{ fontSize: 12, color: T.textTertiary, marginTop: 4 }}>
              {current.article_title || current.article_url}
            </div>
          </div>
        </div>
      </div>

      {/* Swipe hint — mobile only */}
      <div style={{ textAlign: "center", fontSize: 11, color: T.textTertiary, paddingBottom: 4, opacity: sessionCount === 0 ? 0.7 : 0 }}>
        swipe right to remember · left to forget
      </div>

      {/* Rating buttons */}
      <div style={{ padding: "8px 16px 36px", display: "flex", gap: 10, justifyContent: "center", flexShrink: 0 }}>
        {[
          { rating: 0, label: "Forgot",   sub: nextLabel(0), accent: false },
          { rating: 1, label: "Got it",   sub: nextLabel(1), accent: true  },
          { rating: 2, label: "Easy",     sub: nextLabel(2), accent: false },
        ].map(({ rating, label, sub, accent }) => (
          <button
            key={rating}
            onClick={() => handleRating(rating)}
            style={{
              flex: 1, maxWidth: 160,
              background: accent ? T.accent : T.surface,
              border: `1.5px solid ${accent ? T.accent : T.border}`,
              borderRadius: 14, padding: "13px 8px",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "transform .1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: accent ? T.accentText : T.text }}>{label}</span>
            <span style={{ fontSize: 11, color: T.textTertiary }}>{sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
