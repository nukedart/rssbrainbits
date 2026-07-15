import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { SHAPE } from "../lib/tokens";
import { buildThemeGraph, layoutGraph } from "../lib/graphLayout";

const WIDTH = 600;
const HEIGHT = 400;

export default function ThemeGraph({ highlights, onSelectTheme, activeTag, onSelectEdge }) {
  const { T } = useTheme();
  const [hoveredTag, setHoveredTag] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const { g, pts } = useMemo(() => {
    const g = buildThemeGraph(highlights);
    return { g, pts: layoutGraph(g.nodes, g.edges, { width: WIDTH, height: HEIGHT }) };
  }, [highlights]);

  const containerStyle = {
    background: T.card,
    borderRadius: SHAPE.radiusCard,
    border: `1px solid ${T.border}`,
  };

  if (!g.nodes.length) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: T.textTertiary,
            padding: 40,
          }}
        >
          Tag your cards with themes to see the map.
        </div>
      </div>
    );
  }

  const posByTag = Object.fromEntries(pts.map((p) => [p.tag, p]));

  const handleActivate = (tag) => {
    if (onSelectTheme) onSelectTheme(tag);
  };

  return (
    <div style={containerStyle}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Theme connection map"
      >
        {g.edges.map((edge, i) => {
          const a = posByTag[edge.a];
          const b = posByTag[edge.b];
          if (!a || !b) return null;
          const isHoveredEdge = hoveredEdge === i;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={T.borderStrong}
                strokeWidth={Math.min(edge.weight, 4) + (isHoveredEdge ? 1 : 0)}
                opacity={isHoveredEdge ? 0.9 : 0.5}
              />
              {onSelectEdge && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredEdge(i)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onClick={() => onSelectEdge(edge.a, edge.b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEdge(edge.a, edge.b);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`See cards shared by ${edge.a} and ${edge.b}`}
                />
              )}
            </g>
          );
        })}
        {pts.map((p) => {
          const r = Math.min(8 + Math.sqrt(p.count) * 4, 26);
          const isHovered = hoveredTag === p.tag;
          const isActive = activeTag != null && p.tag === activeTag;
          return (
            <g
              key={p.tag}
              onClick={() => handleActivate(p.tag)}
              onMouseEnter={() => setHoveredTag(p.tag)}
              onMouseLeave={() => setHoveredTag(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleActivate(p.tag);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open theme ${p.tag}`}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={isActive ? T.accent : T.accentSurface}
                stroke={T.accent}
                strokeWidth={isHovered ? 3 : 1.5}
              />
              <text
                x={p.x}
                y={p.y + r + 12}
                fontSize={10}
                fill={isActive ? T.text : T.textSecondary}
                fontWeight={isActive ? 600 : undefined}
                textAnchor="middle"
                pointerEvents="none"
              >
                {p.tag}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
