// ── ReviewPage — Anki-style spaced repetition review ──────────
// Flow: show passage → tap "Show Answer" → annotation revealed → Know / Don't Know
// SM-2 binary variant: Don't Know = interval 1, Know = interval * ease
// Schedule persisted to Supabase highlight_reviews table.
import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getAllHighlights, getHighlightReviews, upsertHighlightReview } from "../lib/supabase";
import { Spinner } from "../components/UI";

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isDue(entry) {
  if (!entry) return true;
  return (entry.next_review ?? todayStr()) <= todayStr();
}

function rate(entry, knew) {
  const ease = knew
    ? Math.min(MAX_EASE, (entry?.ease ?? 2.5) + 0.1)
    : Math.max(MIN_EASE, (entry?.ease ?? 2.5) - 0.2);
  const interval = knew
    ? Math.max(1, Math.round((entry?.interval ?? 1) * ease))
    : 1;
  return { ease, interval, next_review: addDays(todayStr(), interval) };
}

function intervalLabel(interval) {
  if (interval === 1) return "tomorrow";
  if (interval < 7) return `in ${interval}d`;
  if (interval < 30) return `in ${Math.round(interval / 7)}w`;
  return `in ${Math.round(interval / 30)}mo`;
}

export default function ReviewPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [queueIdx, setQueueIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [swipeState, setSwipeState] = useState(null);
  const touchRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAllHighlights(user.id),
      getHighlightReviews(user.id),
    ]).then(([hs, rs]) => {
      setHighlights(hs);
      const map = {};
      rs.forEach(r => { map[r.highlight_id] = r; });

      // One-time migration from localStorage (best-effort)
      const localKey = `fb-sr-${user.id}`;
      const localRaw = localStorage.getItem(localKey);
      if (localRaw && rs.length === 0) {
        try {
          const local = JSON.parse(localRaw);
          Object.entries(local).forEach(([hid, entry]) => {
            const migrated = { highlight_id: hid, ease: entry.ease, interval: entry.interval, next_review: entry.nextReview };
            map[hid] = migrated;
            upsertHighlightReview(user.id, hid, migrated).catch(() => {});
          });
          localStorage.removeItem(localKey);
        } catch {}
      }
      setReviews(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const queue = useMemo(
    () => highlights.filter(h => isDue(reviews[h.id])),
    [highlights, reviews]
  );

  const current = queue[queueIdx];
  const done = !loading && queueIdx >= queue.length;
  const total = queue.length;
  const progress = total > 0 ? queueIdx / total : 1;

  function handleRating(knew) {
    if (!current || !user) return;
    const updated = rate(reviews[current.id], knew);
    setReviews(prev => ({ ...prev, [current.id]: { highlight_id: current.id, ...updated } }));
    upsertHighlightReview(user.id, current.id, updated).catch(console.error);
    setSwipeState(null);
    setRevealed(false);
    setQueueIdx(i => i + 1);
    setSessionCount(n => n + 1);
  }

  // Swipe — only rates after answer is revealed
  function onTouchStart(e) {
    touchRef.current = { x: e.touches[0].clientX };
  }
  function onTouchMove(e) {
    if (!touchRef.current || !revealed) return;
    const dx = e.touches[0].clientX - touchRef.current.x;
    if (Math.abs(dx) > 30) setSwipeState(dx > 0 ? "right" : "left");
  }
  function onTouchEnd() {
    if (revealed && swipeState === "right") handleRating(true);
    else if (revealed && swipeState === "left") handleRating(false);
    else setSwipeState(null);
    touchRef.current = null;
  }

  function nextLabel(knew) {
    return intervalLabel(rate(reviews[current?.id], knew).interval);
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
        <div style={{ fontSize: 32, marginBottom: 16, color: T.textTertiary, letterSpacing: "-.02em" }}>○</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: "-.02em" }}>No highlights yet</div>
        <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
          Select text while reading to create a card. Your highlights will appear here for daily review.
        </div>
      </div>
    );
  }

  if (done) {
    const dueTomorrow = highlights.filter(h => {
      const r = reviews[h.id];
      return r && r.next_review === addDays(todayStr(), 1);
    }).length;
    return (
      <div style={centerStyle}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.accentSurface, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: "-.02em" }}>
          {sessionCount > 0 ? `${sessionCount} reviewed` : "All caught up!"}
        </div>
        <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 4 }}>
          {sessionCount > 0
            ? `You reviewed ${sessionCount} card${sessionCount !== 1 ? "s" : ""} today.`
            : "Nothing due right now — come back tomorrow."}
        </div>
        {dueTomorrow > 0 && (
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 8 }}>
            {dueTomorrow} due tomorrow · {highlights.length} total
          </div>
        )}
      </div>
    );
  }

  const borderColor = swipeState === "right" ? T.accent
    : swipeState === "left" ? "#ef4444"
    : T.border;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0, userSelect: "none" }}>

      {/* Progress bar */}
      <div style={{ height: 2, background: T.surface2, flexShrink: 0 }}>
        <div style={{ height: 2, width: `${progress * 100}%`, background: T.accent, transition: "width .4s ease" }} />
      </div>

      {/* Counter */}
      <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: T.textTertiary }}>{queueIdx + 1} of {total}</div>
      </div>

      {/* Card */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 16px 8px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div style={{
          width: "100%", maxWidth: 560,
          background: T.card, borderRadius: 18,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 2px 20px rgba(0,0,0,.07)",
          transition: "border-color .15s",
          overflow: "hidden",
        }}>
          <div
            onClick={() => !revealed && setRevealed(true)}
            style={{ padding: "28px 28px 24px", cursor: revealed ? "default" : "pointer" }}
          >
            {/* Passage */}
            <div style={{
              fontSize: 19, lineHeight: 1.75, color: T.text,
              fontStyle: "italic", marginBottom: revealed ? 20 : 0,
              fontFamily: "var(--font-serif, Georgia, serif)",
            }}>
              "{current.passage}"
            </div>

            {/* Revealed: annotation + tags + source */}
            {revealed && (
              <>
                {current.note ? (
                  <div style={{
                    fontSize: 14, color: T.textSecondary, lineHeight: 1.65,
                    borderLeft: `2px solid ${T.accent}`,
                    paddingLeft: 14, marginBottom: 16,
                  }}>
                    {current.note}
                  </div>
                ) : (
                  <div style={{
                    fontSize: 13, color: T.textTertiary, lineHeight: 1.6,
                    fontStyle: "italic", marginBottom: 16,
                  }}>
                    No annotation yet.
                  </div>
                )}

                {current.tags?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
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

                {(current.article_title || current.article_url) && (
                  <div style={{ fontSize: 11, color: T.textTertiary }}>
                    {current.article_title || current.article_url}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Show Answer button */}
          {!revealed && (
            <div style={{ padding: "0 28px 28px", display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setRevealed(true)}
                style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: "11px 36px",
                  fontSize: 14, fontWeight: 600, color: T.textSecondary,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "background .12s, color .12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textSecondary; }}
              >
                Show Answer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Swipe hint — fades after first review */}
      <div style={{
        textAlign: "center", fontSize: 11, color: T.textTertiary, paddingBottom: 4,
        opacity: revealed && sessionCount === 0 ? 0.6 : 0, transition: "opacity .3s",
      }}>
        swipe right · know &nbsp;·&nbsp; swipe left · forgot
      </div>

      {/* Rating buttons — only after reveal */}
      {revealed && (
        <div style={{ padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 80px)", display: "flex", gap: 10, justifyContent: "center", flexShrink: 0 }}>
          <button
            onClick={() => handleRating(false)}
            style={{
              flex: 1, maxWidth: 200,
              background: T.surface, border: `1.5px solid ${T.border}`,
              borderRadius: 14, padding: "13px 8px",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "background .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.surface2}
            onMouseLeave={e => e.currentTarget.style.background = T.surface}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Don't Know</span>
            <span style={{ fontSize: 11, color: T.textTertiary }}>{nextLabel(false)}</span>
          </button>

          <button
            onClick={() => handleRating(true)}
            style={{
              flex: 1, maxWidth: 200,
              background: T.accent, border: `1.5px solid ${T.accent}`,
              borderRadius: 14, padding: "13px 8px",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "opacity .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            onTouchStart={e => { e.currentTarget.style.opacity = "0.6"; }}
            onTouchEnd={e => { e.currentTarget.style.opacity = "1"; }}
            onTouchCancel={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: T.accentText }}>Know</span>
            <span style={{ fontSize: 11, color: T.accentText, opacity: 0.7 }}>{nextLabel(true)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
