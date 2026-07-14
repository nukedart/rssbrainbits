import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getAllHighlights, getHighlightReviews, upsertHighlightReview, updateHighlightNote } from "../lib/supabase";
import { Spinner } from "../components/UI";
import { SHAPE } from "../lib/tokens";

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

// ── Daily quota helpers ──────────────────────────────────────────
function getDailyQuota() {
  return parseInt(localStorage.getItem("fb-review-quota") || "5", 10);
}

function getTodayCount(userId) {
  try {
    const raw = localStorage.getItem(`fb-today-${userId}`);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    return date === todayStr() ? count : 0;
  } catch { return 0; }
}

function incTodayCount(userId) {
  const today = todayStr();
  try {
    const raw = localStorage.getItem(`fb-today-${userId}`);
    const prev = raw ? JSON.parse(raw) : { date: today, count: 0 };
    const newCount = (prev.date === today ? prev.count : 0) + 1;
    localStorage.setItem(`fb-today-${userId}`, JSON.stringify({ date: today, count: newCount }));
  } catch {}
}

// ── Streak helpers ───────────────────────────────────────────────
function getStoredStreak(userId) {
  try {
    const raw = localStorage.getItem(`fb-streak-${userId}`);
    if (!raw) return { streak: 0, lastDate: null };
    return JSON.parse(raw);
  } catch { return { streak: 0, lastDate: null }; }
}

function updateAndGetStreak(userId) {
  const { streak, lastDate } = getStoredStreak(userId);
  const today = todayStr();
  const yesterday = addDays(today, -1);
  let newStreak;
  if (lastDate === today) {
    newStreak = streak; // already recorded today
  } else if (lastDate === yesterday) {
    newStreak = streak + 1; // consecutive day
  } else {
    newStreak = 1; // new or broken streak
  }
  localStorage.setItem(`fb-streak-${userId}`, JSON.stringify({ streak: newStreak, lastDate: today }));
  return newStreak;
}

export default function ReviewPage({ onDueCount }) {
  const { T } = useTheme();
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [highlights, setHighlights] = useState([]);
  const [reviews, setReviews]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [queueIdx, setQueueIdx]     = useState(0);
  const [revealed, setRevealed]     = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionGot, setSessionGot]     = useState(0);
  const [sessionAgain, setSessionAgain] = useState(0);
  const [cardKey, setCardKey]       = useState(0);
  const [exitAnim, setExitAnim]     = useState(null); // "left" | "right"
  const [sessionQuota, setSessionQuota] = useState(null); // cards left in today's quota at session start
  const [finalStreak, setFinalStreak]   = useState(null);
  const [addingNote, setAddingNote]     = useState(false);
  const [noteText, setNoteText]         = useState("");
  const [swipeHintDone, setSwipeHintDone] = useState(() => !!localStorage.getItem("fb-swipe-hint-done"));

  // Stable refs so keyboard/touch handlers never capture stale closures
  const revealedRef   = useRef(false);
  const exitAnimRef   = useRef(null);
  const touchStartRef = useRef(null);
  const touchDirRef   = useRef(null);
  const handleRatingRef = useRef(null);
  const streakSavedRef  = useRef(false);

  revealedRef.current = revealed;
  exitAnimRef.current = exitAnim;

  useEffect(() => {
    if (!user) return;
    const hKey = `fb-highlights-${user.id}`;
    const rKey = `fb-highlight-reviews-${user.id}`;
    try {
      const hs = JSON.parse(localStorage.getItem(hKey) || "null");
      const rs = JSON.parse(localStorage.getItem(rKey) || "null");
      if (hs && rs) {
        setHighlights(hs);
        const map = {};
        rs.forEach(r => { map[r.highlight_id] = r; });
        setReviews(map);
        const quota = getDailyQuota();
        const doneToday = getTodayCount(user.id);
        setSessionQuota(Math.max(0, quota - doneToday));
        setLoading(false);
      }
    } catch {}
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
        try { localStorage.setItem(hKey, JSON.stringify(hs)); } catch {}
        try { localStorage.setItem(rKey, JSON.stringify(rs)); } catch {}
        // Recompute quota only if not already set from cache
        setSessionQuota(prev => {
          if (prev !== null) return prev;
          const quota = getDailyQuota();
          const doneToday = getTodayCount(user.id);
          return Math.max(0, quota - doneToday);
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Update streak once when session completes
  useEffect(() => {
    if (!loading && queueIdx > 0 && user && finalStreak === null && !streakSavedRef.current) {
      const done = sessionQuota !== null && queueIdx >= Math.min(sessionQuota, highlights.filter(h => isDue(reviews[h.id])).length);
      if (done && sessionCount > 0) {
        streakSavedRef.current = true;
        setFinalStreak(updateAndGetStreak(user.id));
      }
    }
  }, [queueIdx, loading, user, sessionCount, sessionQuota, highlights, reviews, finalStreak]);

  const allDue = useMemo(() => highlights.filter(h => isDue(reviews[h.id])), [highlights, reviews]);
  useEffect(() => { onDueCount?.(allDue.length); }, [allDue.length, onDueCount]);
  // Cap queue to today's remaining quota
  const queue   = useMemo(() => {
    if (sessionQuota === null) return [];
    return allDue.slice(0, sessionQuota);
  }, [allDue, sessionQuota]);
  const current = queue[queueIdx];
  const done    = !loading && sessionQuota !== null && queueIdx >= queue.length;
  const total   = queue.length;
  const progress = total > 0 ? queueIdx / total : (done ? 1 : 0);
  const dailyQuota = getDailyQuota();

  function handleRating(knew) {
    if (!current || !user || exitAnimRef.current) return;
    const updated = rate(reviews[current.id], knew);
    setReviews(prev => ({ ...prev, [current.id]: { highlight_id: current.id, ...updated } }));
    upsertHighlightReview(user.id, current.id, updated).catch(console.error);
    incTodayCount(user.id);
    if (knew) setSessionGot(n => n + 1); else setSessionAgain(n => n + 1);
    setExitAnim(knew ? "left" : "right");
    setTimeout(() => {
      setExitAnim(null);
      setRevealed(false);
      setAddingNote(false);
      setNoteText("");
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
    if (touchDirRef.current === "right") { handleRatingRef.current(true); dismissSwipeHint(); }
    else if (touchDirRef.current === "left") { handleRatingRef.current(false); dismissSwipeHint(); }
    touchStartRef.current = null;
    touchDirRef.current = null;
  }

  function dismissSwipeHint() {
    if (!swipeHintDone) { localStorage.setItem("fb-swipe-hint-done", "1"); setSwipeHintDone(true); }
  }

  async function handleSaveNote() {
    if (!current || !noteText.trim()) return;
    await updateHighlightNote(current.id, noteText.trim());
    setHighlights(prev => prev.map(h => h.id === current.id ? { ...h, note: noteText.trim() } : h));
    setAddingNote(false);
  }

  const center = {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: T.bg, padding: "24px 20px", gap: 12,
  };

  if (loading) return <div style={center}><Spinner size={28} /></div>;

  if (highlights.length === 0) return (
    <div style={center}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textTertiary, opacity: 0.4 }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-.025em" }}>No highlights yet</div>
      <div style={{ fontSize: 14, color: T.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 1.65 }}>
        Select text while reading to create a highlight. Cards appear here for daily review.
      </div>
    </div>
  );

  if (done) {
    const streak = finalStreak ?? getStoredStreak(user?.id).streak;
    const dueCount = allDue.length;
    const dueTomorrow = highlights.filter(h => {
      const r = reviews[h.id];
      return r && r.next_review === addDays(todayStr(), 1);
    }).length;
    const quotaMet = sessionQuota === 0; // arrived already done
    return (
      <div style={center}>
        {/* Streak display */}
        {streak > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            marginBottom: 8,
          }}>
            <div style={{
              fontSize: 52, fontWeight: 900, color: T.accent,
              letterSpacing: "-.04em", lineHeight: 1,
            }}>{streak}</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.accent,
              letterSpacing: ".06em", textTransform: "uppercase",
            }}>day streak</div>
          </div>
        )}

        {/* Check circle */}
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.accentSurface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: "-.03em" }}>
          {quotaMet ? "All done for today" : sessionCount > 0 ? `${sessionCount} reviewed` : "All caught up"}
        </div>
        {sessionCount > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20, background: T.accentSurface, color: T.accent }}>
              {sessionGot} got it
            </span>
            {sessionAgain > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20, background: T.surface2, color: T.textSecondary }}>
                {sessionAgain} again
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 15, color: T.textSecondary }}>
          {quotaMet
            ? `Come back tomorrow — ${dueCount > dailyQuota ? dueCount - dailyQuota : 0} more cards waiting.`
            : sessionCount > 0
              ? `Daily goal hit. See you tomorrow.`
              : "Nothing due — come back tomorrow."}
        </div>
        {dueTomorrow > 0 && (
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 4 }}>
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

      {/* Progress bar — 6px with labels */}
      <div style={{ padding: "16px 20px 4px", flexShrink: 0 }}>
        <div
          role="progressbar"
          aria-valuenow={queueIdx}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Review progress: ${queueIdx} of ${total} done`}
          style={{ height: 6, background: T.surface2, borderRadius: SHAPE.radiusPill, overflow: "hidden" }}
        >
          <div style={{
            height: "100%", borderRadius: SHAPE.radiusPill,
            width: "100%",
            background: T.accent,
            transform: `scaleX(${progress})`,
            transformOrigin: "left",
            transition: "transform .5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
          <span style={{ fontSize: 12, color: T.textTertiary }}>{queueIdx} done</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>{queueIdx + 1} of {total} today</span>
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
            background: T.card, borderRadius: SHAPE.radiusCard,
            border: `1px solid ${T.border}`,
            boxShadow: SHAPE.shadowFloat,
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
              role={revealed ? undefined : "button"}
              tabIndex={revealed ? undefined : 0}
              aria-label={revealed ? undefined : "Click or press Enter to reveal your note"}
              onClick={() => !revealed && setRevealed(true)}
              onKeyDown={e => { if (!revealed && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setRevealed(true); } }}
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
                <div style={{ padding: "20px 24px 20px" }}>
                  {current.note && !addingNote ? (
                    <div style={{
                      fontSize: 15, color: T.textSecondary, lineHeight: 1.68,
                      borderLeft: `3px solid ${T.accent}`,
                      paddingLeft: 16,
                      marginBottom: current.tags?.length ? 16 : 0,
                      WebkitFontSmoothing: "antialiased",
                    }}>
                      {current.note}
                    </div>
                  ) : addingNote ? (
                    <div style={{ marginBottom: current.tags?.length ? 16 : 0 }}>
                      <textarea
                        autoFocus
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Write your annotation…"
                        aria-label="Write your annotation"
                        rows={3}
                        style={{
                          width: "100%", boxSizing: "border-box", resize: "none",
                          fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
                          padding: "10px 12px", borderRadius: SHAPE.radiusSm,
                          border: `1px solid ${T.accent}`,
                          background: T.bg, color: T.text, outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={handleSaveNote} style={{
                          flex: 1, padding: "9px", borderRadius: SHAPE.radiusSm, border: "none",
                          background: T.accent, color: T.accentText,
                          fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                        }}>Save</button>
                        <button onClick={() => { setAddingNote(false); setNoteText(""); }} style={{
                          padding: "9px 16px", borderRadius: SHAPE.radiusSm,
                          border: `1px solid ${T.border}`, background: "transparent",
                          color: T.textSecondary, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingNote(true); setNoteText(""); }}
                      style={{
                        width: "100%", padding: "12px", borderRadius: SHAPE.radiusSm, cursor: "pointer",
                        border: `1px dashed ${T.border}`, background: "transparent",
                        color: T.textTertiary, fontSize: 13, fontFamily: "inherit",
                        fontStyle: "italic", textAlign: "center",
                        marginBottom: current.tags?.length ? 16 : 0,
                      }}
                    >+ Add annotation</button>
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
                    borderRadius: SHAPE.radiusSm, padding: "15px",
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
            background: T.surface, borderRadius: SHAPE.radiusSm, padding: "15px 8px",
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
            background: T.accent, borderRadius: SHAPE.radiusSm, padding: "15px 8px",
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

      {/* Hint row — swipe on mobile, keyboard on desktop */}
      {isMobile ? (
        !swipeHintDone && revealed && (
          <div style={{ textAlign: "center", fontSize: 11, color: T.textTertiary, paddingBottom: 8, opacity: .5, letterSpacing: ".01em", transition: "opacity .3s" }}>
            ← swipe to rate →
          </div>
        )
      ) : (
        <div style={{ textAlign: "center", fontSize: 11, color: T.textTertiary, paddingBottom: 8, opacity: .4, letterSpacing: ".01em" }}>
          space · show answer &nbsp;·&nbsp; ← again &nbsp;·&nbsp; got it →
        </div>
      )}
    </div>
  );
}
