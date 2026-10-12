import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getAllHighlights, getHighlightReviews, upsertHighlightReview, updateHighlightNote } from "../lib/supabase";
import { Spinner } from "../components/UI";
import { SHAPE } from "../lib/tokens";
import { relatedHighlights } from "../lib/zettel";

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
// Single user-facing control: "Cards per review session" in Settings
// (fb-review-count). Legacy fb-review-quota kept as fallback; it never
// had a Settings UI, so most users only ever had the old default of 5.
function getDailyQuota() {
  return parseInt(localStorage.getItem("fb-review-count") || localStorage.getItem("fb-review-quota") || "10", 10);
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
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionGot, setSessionGot]     = useState(0);
  const [sessionAgain, setSessionAgain] = useState(0);
  const [cardKey, setCardKey]       = useState(0);
  const [exitAnim, setExitAnim]     = useState(null); // "left" | "right"
  const [sessionQuota, setSessionQuota] = useState(null); // cards left in today's quota at session start
  const [finalStreak, setFinalStreak]   = useState(null);
  const [addingNote, setAddingNote]     = useState(false);
  const [revealedId, setRevealedId]     = useState(null);
  const [noteText, setNoteText]         = useState("");
  const [swipeHintDone, setSwipeHintDone] = useState(() => !!localStorage.getItem("fb-swipe-hint-done"));
  const [sessionSize] = useState(() => parseInt(localStorage.getItem("fb-review-count") || "10", 10));

  // Stable refs so keyboard/touch handlers never capture stale closures
  const exitAnimRef   = useRef(null);
  const touchStartRef = useRef(null);
  const touchDirRef   = useRef(null);
  const handleRatingRef = useRef(null);
  const streakSavedRef  = useRef(false);

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
  // Cap queue to today's remaining quota and the configured session size
  const queue   = useMemo(() => {
    if (sessionQuota === null) return [];
    return allDue.slice(0, Math.min(sessionQuota, sessionSize));
  }, [allDue, sessionQuota, sessionSize]);
  const current = queue[queueIdx];
  const connectedCards = useMemo(
    () => current ? relatedHighlights(current, highlights, 3) : [],
    [current?.id, highlights]
  );
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
      setAddingNote(false);
      setNoteText("");
      setQueueIdx(i => i + 1);
      setSessionCount(n => n + 1);
      setCardKey(k => k + 1);
    }, 270);
  }
  handleRatingRef.current = handleRating;

  function handleMaster() {
    if (!current || !user || exitAnimRef.current) return;
    const ease = reviews[current.id]?.ease ?? 2.5;
    const updated = { ease, interval: 3650, next_review: addDays(todayStr(), 3650) };
    setReviews(prev => ({ ...prev, [current.id]: { highlight_id: current.id, ...updated } }));
    upsertHighlightReview(user.id, current.id, updated).catch(console.error);
    incTodayCount(user.id);
    setSessionGot(n => n + 1);
    setExitAnim("left");
    setTimeout(() => {
      setExitAnim(null);
      setAddingNote(false);
      setNoteText("");
      setQueueIdx(i => i + 1);
      setSessionCount(n => n + 1);
      setCardKey(k => k + 1);
    }, 270);
  }

  // Keyboard: Space/Enter/→/K = Next, ←/J = Show again soon
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      // BUTTON: let focused buttons (Mastered, note nudge) activate via Enter/Space
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON") return;
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight" || e.key === "k") {
        e.preventDefault();
        handleRatingRef.current(true);
      }
      if (e.key === "ArrowLeft" || e.key === "j") handleRatingRef.current(false);
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
    if (!touchStartRef.current) return;
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
      <div style={{ fontSize: 28, fontWeight: 600, color: T.text, letterSpacing: "-0.02em" }}>No highlights yet</div>
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
              fontSize: 52, fontWeight: 600, color: T.accent,
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

        <div style={{ fontSize: 28, fontWeight: 600, color: T.text, letterSpacing: "-0.02em" }}>
          {quotaMet ? "All done for today" : sessionCount > 0 ? `${sessionCount} reviewed` : "All caught up"}
        </div>
        {sessionCount > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 500, padding: 0, background: "transparent", color: T.textTertiary }}>
              {sessionGot} got it
            </span>
            {sessionAgain > 0 && (
              <span style={{ fontSize: 15, fontWeight: 500, padding: 0, background: "transparent", color: T.textTertiary }}>
                {sessionAgain} again
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 15, color: T.textTertiary }}>
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

  const DOTS = ["#65D5C4", "#F2C462", "#EE9A8E", "#A99BE0"];
  const tag0 = current.tags?.[0];
  const dotColor = tag0 ? DOTS[[...tag0].reduce((a, c) => a + c.charCodeAt(0), 0) % DOTS.length] : T.textTertiary;
  const revealed = revealedId === current.id;
  const hasNote = !!current.note || addingNote;
  const ratingBtn = (label, knew, strong) => (
    <button
      key={label}
      onClick={() => handleRating(knew)}
      style={{
        flex: 1, minHeight: 44, border: "none", borderRadius: 999,
        background: strong ? T.text : "transparent",
        color: strong ? T.bg : T.text,
        fontSize: 15, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
        transition: "opacity .1s",
      }}
      onTouchStart={e => e.currentTarget.style.opacity = ".6"}
      onTouchEnd={e => e.currentTarget.style.opacity = "1"}
      onTouchCancel={e => e.currentTarget.style.opacity = "1"}
    >{label}</button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0, userSelect: "none", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", flex: 1 }}>

      {/* Header */}
      <div style={{ padding: "56px 24px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, color: T.text }}>Review</h1>
        <span style={{ fontSize: 15, color: T.textTertiary }}>{Math.min(queueIdx + 1, total)} of {total}</span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "16px 24px 20px", flexShrink: 0 }}>
        <div
          role="progressbar"
          aria-valuenow={queueIdx}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Review progress: ${queueIdx} of ${total} done`}
          style={{ height: 4, background: T.surface2, borderRadius: 999, overflow: "hidden" }}
        >
          <div style={{
            height: "100%", borderRadius: 999, width: "100%",
            background: T.accent,
            transform: `scaleX(${progress})`,
            transformOrigin: "left",
            transition: "transform .5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
      </div>

      {/* Card area */}
      <div
        style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 24px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div key={cardKey} style={{ width: "100%", animation: cardAnim }}>
          <div
            onClick={() => { if (!revealed) setRevealedId(current.id); }}
            style={{
              background: T.card, borderRadius: 28, padding: 28,
              minHeight: isMobile ? 360 : 400, boxSizing: "border-box",
              boxShadow: "0 2px 4px rgba(0,0,0,.04), 0 16px 40px rgba(0,0,0,.08)",
              display: "flex", flexDirection: "column", gap: 16,
              cursor: revealed ? "default" : "pointer",
            }}
          >
            {/* Tag label */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textTertiary, minHeight: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tag0 || current.article_title || "Untagged"}
              </span>
            </div>

            {/* Highlight */}
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
              fontFamily: "var(--reader-font-family)", fontSize: 26, lineHeight: 1.35, color: T.text,
              WebkitFontSmoothing: "antialiased",
            }}>
              <span>{current.passage}</span>
            </div>

            {!revealed ? (
              <div style={{ textAlign: "center", fontSize: 14, color: T.textTertiary }}>Tap to reveal your note</div>
            ) : (
              <div style={{ userSelect: "text" }} onClick={e => e.stopPropagation()}>
                {current.note && !addingNote ? (
                  <div style={{ fontSize: 15, color: T.textSecondary, lineHeight: 1.6, textAlign: "center" }}>
                    {current.note}
                  </div>
                ) : addingNote ? (
                  <div>
                    <textarea
                      autoFocus
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Write your annotation…"
                      aria-label="Write your annotation"
                      rows={3}
                      style={{
                        width: "100%", boxSizing: "border-box", resize: "none",
                        fontSize: 15, lineHeight: 1.6, fontFamily: "inherit",
                        padding: "10px 12px", borderRadius: 16,
                        border: `1px solid ${T.accent}`,
                        background: T.bg, color: T.text, outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={handleSaveNote} style={{
                        flex: 1, minHeight: 44, borderRadius: 999, border: "none",
                        background: T.text, color: T.bg,
                        fontSize: 15, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
                      }}>Save</button>
                      <button onClick={() => { setAddingNote(false); setNoteText(""); }} style={{
                        minHeight: 44, padding: "0 20px", borderRadius: 999,
                        border: "none", background: "transparent",
                        color: T.textTertiary, fontSize: 15, fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
                      }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingNote(true); setNoteText(""); }}
                    style={{
                      display: "block", margin: "0 auto", minHeight: 44, padding: "0 16px",
                      border: "none", background: "transparent", cursor: "pointer",
                      color: T.textTertiary, fontSize: 14, fontFamily: "inherit",
                    }}
                  >Add a note in your own words</button>
                )}
                {connectedCards.length > 0 && (
                  <div style={{ marginTop: 16, fontSize: 13, color: T.textTertiary, textAlign: "center" }}>
                    {connectedCards.length} connected {connectedCards.length === 1 ? "card" : "cards"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating pill */}
      <div style={{ padding: "20px 24px 8px", flexShrink: 0 }}>
        <div
          role="group"
          aria-label="Rate recall"
          style={{
            display: "flex", gap: 4, alignItems: "center", height: 56, padding: 6, boxSizing: "border-box",
            borderRadius: 999, background: T.card, boxShadow: "0 1px 2px rgba(0,0,0,.05)",
          }}
        >
          {ratingBtn("Again", false, false)}
          {ratingBtn("Hard", true, false)}
          {ratingBtn("Good", true, true)}
          {ratingBtn("Easy", true, false)}
        </div>
      </div>

      {/* Mastered — retire card from rotation */}
      <div style={{ padding: "0 24px", flexShrink: 0, textAlign: "center" }}>
        <button
          onClick={handleMaster}
          style={{
            border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
            color: T.textTertiary, fontSize: 13, borderRadius: 999,
            minHeight: 44, padding: "0 16px", transition: "color .12s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = T.textTertiary}
        >
          Mastered — retire this card
        </button>
      </div>

      {/* Hint row — swipe on mobile, keyboard on desktop */}
      {isMobile ? (
        !swipeHintDone && (
          <div style={{ textAlign: "center", fontSize: 12, color: T.textTertiary, paddingBottom: 8, opacity: .6 }}>
            ← swipe to rate →
          </div>
        )
      ) : (
        <div style={{ textAlign: "center", fontSize: 12, color: T.textTertiary, paddingBottom: 8, opacity: .6 }}>
          space · next &nbsp;·&nbsp; ← again
        </div>
      )}
      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 72px)", flexShrink: 0 }} />
      </div>
    </div>
  );
}
