import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
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
  const { isMobile } = useBreakpoint();
  const [highlights, setHighlights] = useState([]);
  const [reviews, setReviews]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [queueIdx, setQueueIdx]     = useState(0);
  const [revealed, setRevealed]     = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [cardKey, setCardKey]       = useState(0);
  const [exitAnim, setExitAnim]     = useState(null); // "left" | "right"

  // Stable refs so keyboard/touch handlers never capture stale closures
  const revealedRef   = useRef(false);
  const exitAnimRef   = useRef(null);
  const touchStartRef = useRef(null);
  const touchDirRef   = useRef(null);
  const handleRatingRef = useRef(null);

  revealedRef.current = revealed;
  exitAnimRef.current = exitAnim;

  useEffect(() => {
    if (!user) return;
    Promise.all([getAllHighlights(user.id), getHighlightReviews(user.id)])
      .then(([hs, rs]) => {
        setHighlights(hs);
        const map = {};
        rs.forEach(r => { map[r.highlight_id] = r; });
        // One-time migration from localStorage
        const localKey = `fb-sr-${user.id}`;
        const localRaw = localStorage.getItem(localKey);
        if (localRaw && rs.length === 0) {
          try {
            const local = JSON.parse(localRaw);
            Object.entries(local).forEach(([hid, entry]) => {
              const m = { highlight_id: hid, ease: entry.ease, interval: entry.interval, next_review: entry.nextReview };
              map[hid] = m;
              upsertHighlightReview(user.id, hid, m).catch(() => {});
            });
            localStorage.removeItem(localKey);
          } catch {}
        }
        setReviews(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const queue   = useMemo(() => highlights.filter(h => isDue(reviews[h.id])), [highlights, reviews]);
  const current = queue[queueIdx];
  const done    = !loading && queueIdx >= queue.length;
  const total   = queue.length;
  const progress = total > 0 ? queueIdx / total : 1;

  function handleRating(knew) {
    if (!current || !user || exitAnimRef.current) return;
    const updated = rate(reviews[current.id], knew);
    setReviews(prev => ({ ...prev, [current.id]: { highlight_id: current.id, ...updated } }));
    upsertHighlightReview(user.id, current.id, updated).catch(console.error);
    setExitAnim(knew ? "left" : "right");
    setTimeout(() => {
      setExitAnim(null);
      setRevealed(false);
      setQueueIdx(i => i + 1);
      setSessionCount(n => n + 1);
      setCardKey(k => k + 1);
    }, 270);
  }
  handleRatingRef.current = handleRating;

  // Keyboard: Space/Enter = reveal, ←/J = Again, →/K = Got it
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealedRef.current) setRevealed(true);
      }
      if ((e.key === "ArrowRight" || e.key === "k") && revealedRef.current) handleRatingRef.current(true);
      if ((e.key === "ArrowLeft"  || e.key === "j") && revealedRef.current) handleRatingRef.current(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch/swipe
  function onTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDirRef.current = null;
  }
  function onTouchMove(e) {
    if (!touchStartRef.current || !revealedRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) + 10 && Math.abs(dx) > 44) {
      touchDirRef.current = dx > 0 ? "right" : "left";
    }
  }
  function onTouchEnd() {
    if (touchDirRef.current === "right") handleRatingRef.current(true);
    else if (touchDirRef.current === "left") handleRatingRef.current(false);
    touchStartRef.current = null;
    touchDirRef.current = null;
  }

  const center = {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: T.bg, padding: "24px 20px", gap: 12,
  };

  if (loading) return <div style={center}><Spinner size={28} /></div>;

  if (highlights.length === 0) return (
    <div style={center}>
      <div style={{ fontSize: 44, opacity: 0.18 }}>○</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-.025em" }}>No highlights yet</div>
      <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 1.65 }}>
        Select text while reading to create a highlight. Cards appear here for daily review.
      </div>
    </div>
  );

  if (done) {
    const dueTomorrow = highlights.filter(h => {
      const r = reviews[h.id];
      return r && r.next_review === addDays(todayStr(), 1);
    }).length;
    return (
      <div style={center}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.accentSurface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: "-.03em" }}>
          {sessionCount > 0 ? `${sessionCount} reviewed` : "All caught up"}
        </div>
        <div style={{ fontSize: 15, color: T.textSecondary }}>
          {sessionCount > 0 ? "Great session." : "Nothing due — come back tomorrow."}
        </div>
        {dueTomorrow > 0 && (
          <div style={{ fontSize: 13, color: T.textTertiary }}>
            {dueTomorrow} due tomorrow · {highlights.length} total
          </div>
        )}
      </div>
    );
  }

  const cardAnim = exitAnim === "left"  ? "rv-exit-left .27s ease forwards"
    : exitAnim === "right" ? "rv-exit-right .27s ease forwards"
    : "rv-enter .32s cubic-bezier(.22,.68,0,1.05)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0, userSelect: "none" }}>
      <style>{`
        @keyframes rv-exit-left  { to { transform: translateX(-56px) scale(0.94); opacity: 0; } }
        @keyframes rv-exit-right { to { transform: translateX( 56px) scale(0.94); opacity: 0; } }
        @keyframes rv-enter      { from { transform: translateY(22px) scale(0.96); opacity: 0; } }
        @keyframes rv-reveal     { from { transform: translateY(10px); opacity: 0; } }
      `}</style>

      {/* Progress bar — 6px with labels */}
      <div style={{ padding: "16px 20px 4px", flexShrink: 0 }}>
        <div style={{ height: 6, background: T.surface2, borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${progress * 100}%`,
            background: T.accent,
            transition: "width .5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
          <span style={{ fontSize: 12, color: T.textTertiary }}>{queueIdx} done</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>{queueIdx + 1} of {total}</span>
        </div>
      </div>

      {/* Card area */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px 8px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div key={cardKey} style={{ width: "100%", maxWidth: 580, animation: cardAnim }}>
          <div style={{
            background: T.card, borderRadius: 22,
            border: `1px solid ${T.border}`,
            boxShadow: "0 8px 48px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.05)",
            overflow: "hidden",
          }}>

            {/* Source — visible in question view for memory context */}
            {(current.article_title || current.article_url) && (
              <div style={{
                padding: "16px 24px 0",
                fontSize: 11, color: T.textTertiary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: ".01em",
              }}>
                {current.article_title || current.article_url}
              </div>
            )}

            {/* Passage */}
            <div
              onClick={() => !revealed && setRevealed(true)}
              style={{
                padding: (current.article_title || current.article_url) ? "12px 24px 24px" : "28px 24px 24px",
                fontSize: 20, lineHeight: 1.72,
                fontStyle: "italic",
                fontFamily: "var(--font-serif, Georgia, serif)",
                color: T.text,
                cursor: revealed ? "default" : "pointer",
                WebkitFontSmoothing: "antialiased",
              }}
            >
              "{current.passage}"
            </div>

            {/* Revealed answer — fades in */}
            {revealed && (
              <div style={{ animation: "rv-reveal .22s ease" }}>
                <div style={{ height: 1, background: T.border }} />
                <div style={{ padding: "20px 24px" }}>
                  {current.note ? (
                    <div style={{
                      fontSize: 15, color: T.textSecondary, lineHeight: 1.68,
                      borderLeft: `3px solid ${T.accent}`,
                      paddingLeft: 16,
                      marginBottom: current.tags?.length ? 16 : 0,
                      WebkitFontSmoothing: "antialiased",
                    }}>
                      {current.note}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: T.textTertiary, fontStyle: "italic", marginBottom: current.tags?.length ? 16 : 0 }}>
                      No annotation — tap the card in Cards to add one.
                    </div>
                  )}
                  {current.tags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {current.tags.map(t => (
                        <span key={t} style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 20,
                          background: T.accentSurface, color: T.accent,
                          border: `1px solid ${T.accent}33`,
                          fontWeight: 600, letterSpacing: ".03em",
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show Answer — full-width, primary */}
            {!revealed && (
              <div style={{ padding: "0 24px 24px" }}>
                <button
                  onClick={() => setRevealed(true)}
                  style={{
                    width: "100%", border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: T.accent, color: T.accentText,
                    borderRadius: 14, padding: "15px",
                    fontSize: 16, fontWeight: 700, letterSpacing: "-.01em",
                    transition: "opacity .12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Show Answer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — fade in after reveal, always in same position */}
      <div style={{
        padding: `10px 16px calc(env(safe-area-inset-bottom, 0px) + 80px)`,
        display: "flex", gap: 12, flexShrink: 0,
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed ? "auto" : "none",
        transition: "opacity .2s",
      }}>
        {/* Again */}
        <button
          onClick={() => handleRating(false)}
          style={{
            flex: 1, border: `1.5px solid ${T.border}`,
            background: T.surface, borderRadius: 16, padding: "15px 8px",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            transition: "background .1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.surface2}
          onMouseLeave={e => e.currentTarget.style.background = T.surface}
          onTouchStart={e => e.currentTarget.style.opacity = ".6"}
          onTouchEnd={e => e.currentTarget.style.opacity = "1"}
          onTouchCancel={e => e.currentTarget.style.opacity = "1"}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: "-.01em" }}>Again</span>
          <span style={{ fontSize: 11, color: T.textTertiary }}>
            {intervalLabel(rate(reviews[current?.id], false).interval)}
          </span>
        </button>

        {/* Got it */}
        <button
          onClick={() => handleRating(true)}
          style={{
            flex: 1, border: "none",
            background: T.accent, borderRadius: 16, padding: "15px 8px",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            transition: "opacity .1s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          onTouchStart={e => e.currentTarget.style.opacity = ".6"}
          onTouchEnd={e => e.currentTarget.style.opacity = "1"}
          onTouchCancel={e => e.currentTarget.style.opacity = "1"}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: T.accentText, letterSpacing: "-.01em" }}>Got it</span>
          <span style={{ fontSize: 11, color: T.accentText, opacity: .75 }}>
            {intervalLabel(rate(reviews[current?.id], true).interval)}
          </span>
        </button>
      </div>

      {/* Keyboard hint — desktop only */}
      {!isMobile && (
        <div style={{ textAlign: "center", fontSize: 11, color: T.textTertiary, paddingBottom: 8, opacity: .4, letterSpacing: ".01em" }}>
          space · show answer &nbsp;·&nbsp; ← again &nbsp;·&nbsp; got it →
        </div>
      )}
    </div>
  );
}
