// ── CardsPage — Ryan Holiday notecard theme browser ───────────
// Shows highlights grouped by their theme tags.
// Bucket view → click a theme → card list for that theme.
import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/UI";
import { getAllHighlights } from "../lib/supabase";
import { HIGHLIGHT_COLORS } from "../components/SelectionToolbar";

export default function CardsPage() {
  const { T } = useTheme();
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(null);

  useEffect(() => {
    if (!user) return;
    getAllHighlights(user.id)
      .then(setHighlights)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // theme → highlight[] map, sorted by count desc
  const buckets = useMemo(() => {
    const map = {};
    highlights.forEach(h => {
      (h.tags || []).forEach(tag => {
        if (!map[tag]) map[tag] = [];
        map[tag].push(h);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [highlights]);

  const totalTagged = useMemo(() =>
    new Set(highlights.filter(h => (h.tags || []).length > 0).map(h => h.id)).size,
  [highlights]);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <Spinner size={24} />
    </div>
  );

  // ── Card list view (theme selected) ───────────────────────
  if (selectedTheme) {
    const cards = buckets.find(([t]) => t === selectedTheme)?.[1] || [];
    return (
      <div style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => setSelectedTheme(null)} style={{
              background: T.surface2, border: "none", borderRadius: 8, padding: "6px 12px",
              cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "inherit",
            }}>← All themes</button>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{selectedTheme}</div>
              <div style={{ fontSize: 12, color: T.textTertiary }}>{cards.length} card{cards.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map(h => {
              const col = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
              const otherTags = (h.tags || []).filter(t => t !== selectedTheme);
              return (
                <div key={h.id} style={{
                  background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
                  overflow: "hidden", display: "flex",
                }}>
                  <div style={{ width: 4, background: col.border, flexShrink: 0 }} />
                  <div style={{ padding: "14px 16px", flex: 1 }}>
                    <div style={{ fontSize: 14, color: T.text, lineHeight: 1.65, fontStyle: "italic", marginBottom: h.note ? 8 : 6 }}>
                      "{h.passage}"
                    </div>
                    {h.note && (
                      <div style={{ fontSize: 12, color: T.textSecondary, background: T.surface, borderRadius: 8, padding: "7px 10px", marginBottom: 8, lineHeight: 1.5 }}>
                        {h.note}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: T.textTertiary }}>{h.article_title || "Untitled"}</div>
                    {otherTags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                        {otherTags.map(t => (
                          <span key={t} onClick={() => setSelectedTheme(t)} style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20, cursor: "pointer",
                            background: T.accentSurface, color: T.accent, border: `1px solid ${T.accent}44`,
                          }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Bucket view (all themes) ───────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg, minHeight: 0 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-.02em" }}>Cards</div>
          <div style={{ fontSize: 13, color: T.textTertiary, marginTop: 4 }}>
            {totalTagged} tagged highlight{totalTagged !== 1 ? "s" : ""} · {buckets.length} theme{buckets.length !== 1 ? "s" : ""}
          </div>
        </div>

        {buckets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>No theme cards yet</div>
            <div style={{ fontSize: 13, color: T.textTertiary, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
              Open any article, highlight a passage, then tap "+ theme" in the Highlights drawer to categorize it — like "stoicism" or "leadership".
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {buckets.map(([theme, cards]) => (
              <button key={theme} onClick={() => setSelectedTheme(theme)} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "18px 16px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "border-color .12s, background .12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSurface; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}
              >
                <div style={{ fontSize: 22, marginBottom: 10 }}>📇</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{theme}</div>
                <div style={{ fontSize: 12, color: T.textTertiary }}>{cards.length} card{cards.length !== 1 ? "s" : ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
