"use client";

import { useId, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

export function mFmt(n: number, dp = 1): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(dp) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(dp) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(dp);
}

// ── Compass mark (logo) ───────────────────────────────────────────────────────

export function MMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.2" stroke="var(--m-accent)" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="9" stroke="var(--m-ink-faint)" strokeWidth="0.8" />
      <path d="M16 3 L16 29 M3 16 L29 16" stroke="var(--m-line)" strokeWidth="0.7" />
      <path d="M16 7 L19 16 L16 25 L13 16 Z" fill="var(--m-accent)" opacity="0.9" />
      <circle cx="16" cy="16" r="1.6" fill="var(--m-ink)" />
    </svg>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function MPanel({
  children,
  style,
  pad = 22,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--m-panel)",
        border: "1px solid var(--m-line)",
        borderRadius: "var(--m-r)",
        padding: pad,
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Thread (divider) ──────────────────────────────────────────────────────────

export function MThread({ vertical }: { vertical?: boolean }) {
  if (vertical)
    return (
      <div
        style={{ width: 1, alignSelf: "stretch", background: "var(--m-line)" }}
      />
    );
  return (
    <div style={{ height: 1, background: "var(--m-line)", width: "100%" }} />
  );
}

// ── Eyebrow ───────────────────────────────────────────────────────────────────

export function MEyebrow({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="m-eyebrow" style={style}>
      {children}
    </div>
  );
}

// ── Section head ──────────────────────────────────────────────────────────────

export function MSectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
      }}
    >
      <div>
        {eyebrow && (
          <MEyebrow style={{ marginBottom: 7 }}>{eyebrow}</MEyebrow>
        )}
        <h2
          className="m-serif"
          style={{
            margin: 0,
            fontSize: 27,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1,
            color: "var(--m-ink)",
          }}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

// ── Delta chip ────────────────────────────────────────────────────────────────

export function MDelta({
  value,
  suffix = "%",
  size = 12,
}: {
  value: number;
  suffix?: string;
  size?: number;
}) {
  const pos = value >= 0;
  return (
    <span
      className="m-mono m-tnum"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: size,
        color: pos ? "var(--m-pos)" : "var(--m-neg)",
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: size * 0.8 }}>{pos ? "▲" : "▼"}</span>
      {pos ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────

type PillTone =
  | "low"
  | "healthy"
  | "optimal"
  | "medium"
  | "reorder"
  | "high"
  | "pending"
  | "critical"
  | "neutral";

const PILL_COLORS: Record<string, string> = {
  low: "var(--m-pos)",
  healthy: "var(--m-pos)",
  optimal: "var(--m-pos)",
  medium: "var(--m-warn)",
  reorder: "var(--m-warn)",
  high: "var(--m-warn)",
  pending: "var(--m-warn)",
  critical: "var(--m-neg)",
  neutral: "var(--m-ink-faint)",
};

export function MPill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone | string;
  children: ReactNode;
}) {
  const col = PILL_COLORS[tone] ?? "var(--m-ink-faint)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--m-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: col,
        border: "1px solid currentColor",
        borderRadius: 999,
        padding: "3px 9px",
        opacity: 0.95,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: "currentColor",
        }}
      />
      {children}
    </span>
  );
}

// ── Stat (big KPI) ────────────────────────────────────────────────────────────

export function MStat({
  value,
  unit,
  prefix,
  caption,
  eyebrow,
  delta,
  spark,
}: {
  value: string | number;
  unit?: string;
  prefix?: string;
  caption?: string;
  eyebrow?: string;
  delta?: number;
  spark?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {eyebrow && (
        <MEyebrow style={{ marginBottom: 12 }}>{eyebrow}</MEyebrow>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        {prefix && (
          <span
            className="m-serif"
            style={{ fontSize: 24, color: "var(--m-ink-dim)" }}
          >
            {prefix}
          </span>
        )}
        <span
          className="m-serif m-tnum"
          style={{
            fontSize: 46,
            fontWeight: 500,
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            color: "var(--m-ink)",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="m-serif"
            style={{ fontSize: 22, color: "var(--m-ink-dim)" }}
          >
            {unit}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
        }}
      >
        {delta !== undefined && <MDelta value={delta} />}
        {caption && (
          <span style={{ fontSize: 12, color: "var(--m-ink-faint)" }}>
            {caption}
          </span>
        )}
      </div>
      {spark && (
        <div style={{ marginTop: "auto", paddingTop: 16 }}>{spark}</div>
      )}
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export function MPage({
  title,
  eyebrow,
  period = "FY26 · Período actual",
  children,
  right,
}: {
  title: string;
  eyebrow?: string;
  period?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div style={{ animation: "mFadeUp .4s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 26,
          flexWrap: "wrap",
        }}
      >
        <div>
          {eyebrow && (
            <MEyebrow style={{ marginBottom: 10 }}>{eyebrow}</MEyebrow>
          )}
          <h1
            className="m-serif"
            style={{
              margin: 0,
              fontSize: "clamp(34px, 4vw, 52px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 0.96,
              color: "var(--m-ink)",
            }}
          >
            {title}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {right}
          <div style={{ textAlign: "right" }}>
            <MEyebrow style={{ marginBottom: 5 }}>Período</MEyebrow>
            <div
              className="m-mono"
              style={{ fontSize: 12.5, color: "var(--m-ink)" }}
            >
              {period}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────

export function MSegmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--m-surface-2)",
        borderRadius: "var(--m-r-pill)",
        padding: 3,
        border: "1px solid var(--m-line)",
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--m-r-pill)",
            border: "none",
            cursor: "pointer",
            background: value === o ? "var(--m-panel)" : "transparent",
            color: value === o ? "var(--m-ink)" : "var(--m-ink-faint)",
            fontFamily: "var(--m-mono)",
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500,
            transition: "all .18s",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Live Ticker ───────────────────────────────────────────────────────────────

export function MTicker({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        overflow: "hidden",
        height: 30,
        borderBottom: "1px solid var(--m-line)",
        background: "var(--m-panel)",
        flexShrink: 0,
      }}
    >
      <span
        className="m-eyebrow"
        style={{
          flexShrink: 0,
          paddingLeft: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--m-pos)",
            boxShadow:
              "0 0 0 3px color-mix(in srgb, var(--m-pos) 25%, transparent)",
          }}
        />
        Live
      </span>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          maskImage:
            "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 40,
            whiteSpace: "nowrap",
            animation: "tickerScroll 46s linear infinite",
            paddingLeft: 20,
          }}
        >
          {doubled.map((t, i) => (
            <span
              key={i}
              className="m-mono"
              style={{
                fontSize: 11,
                color: "var(--m-ink-dim)",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {t}
              <span style={{ color: "var(--m-ink-faint)" }}>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Sparkline ─────────────────────────────────────────────────────────────────

export function MSparkline({
  data,
  w = 220,
  h = 56,
  color,
  fill = true,
  strokeW = 1.6,
  dot = true,
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
  strokeW?: number;
  dot?: boolean;
}) {
  const id = useId();
  const c = color ?? "var(--m-accent)";
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const X = (i: number) =>
    pad + (i / (data.length - 1)) * (w - pad * 2);
  const Y = (v: number) =>
    h - pad - ((v - min) / ((max - min) || 1)) * (h - pad * 2);
  const pts = data.map((v, i) => [X(i), Y(v)] as [number, number]);
  const line = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const area =
    line +
    ` L${X(data.length - 1).toFixed(1)} ${h - pad} L${X(0).toFixed(1)} ${
      h - pad
    } Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.22" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={c}
        strokeWidth={strokeW}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {dot && (
        <circle
          cx={X(data.length - 1)}
          cy={Y(data[data.length - 1])}
          r="2.6"
          fill={c}
        />
      )}
    </svg>
  );
}

// ── Dual Line (actual vs target) ──────────────────────────────────────────────

export function MDualLine({
  a,
  b,
  w = 600,
  h = 200,
  color,
}: {
  a: number[];
  b: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  const id = useId();
  const c = color ?? "var(--m-accent)";
  const all = [...a, ...b];
  const min = Math.min(...all) * 0.96;
  const max = Math.max(...all) * 1.04;
  const pad = 6;
  const X = (i: number) =>
    pad + (i / (a.length - 1)) * (w - pad * 2);
  const Y = (v: number) =>
    h - pad - ((v - min) / ((max - min) || 1)) * (h - pad * 2);
  const toPath = (d: number[]) =>
    d
      .map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1))
      .join(" ");
  const areaA =
    toPath(a) +
    ` L${X(a.length - 1)} ${h - pad} L${X(0)} ${h - pad} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.18" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={w - pad}
          y1={pad + g * (h - pad * 2)}
          y2={pad + g * (h - pad * 2)}
          stroke="var(--m-line-soft)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={areaA} fill={`url(#${id})`} />
      <path
        d={toPath(b)}
        fill="none"
        stroke="var(--m-ink-faint)"
        strokeWidth="1.2"
        strokeDasharray="3 4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={toPath(a)}
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {a.map((v, i) => (
        <circle
          key={i}
          cx={X(i)}
          cy={Y(v)}
          r="2.2"
          fill="var(--m-panel)"
          stroke={c}
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

// ── Horizontal Bars ───────────────────────────────────────────────────────────

export function MHBars({
  rows,
  max: maxProp,
  color,
  money = true,
}: {
  rows: Array<{ label?: string; cat?: string; region?: string; value: number }>;
  max?: number;
  color?: string;
  money?: boolean;
}) {
  const c = color ?? "var(--m-accent)";
  const mx = maxProp ?? Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 56px",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--m-ink-dim)" }}>
            {r.cat ?? r.label ?? r.region}
          </span>
          <div
            style={{
              height: 7,
              background: "var(--m-surface-2)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: (r.value / mx) * 100 + "%",
                height: "100%",
                background: c,
                borderRadius: 999,
                transition: "width .6s cubic-bezier(.2,.7,.2,1)",
              }}
            />
          </div>
          <span
            className="m-mono m-tnum"
            style={{ fontSize: 12, textAlign: "right", color: "var(--m-ink)" }}
          >
            {money ? mFmt(r.value * 1e6) : r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────

export function MDonut({
  value,
  max = 100,
  size = 124,
  stroke = 11,
  color,
  label,
  sub,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  sub?: string;
}) {
  const c = color ?? "var(--m-accent)";
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(value / max, 1);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--m-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(frac * circ).toFixed(1)} ${circ.toFixed(1)}`}
          style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="m-serif m-tnum"
          style={{ fontSize: size * 0.3, lineHeight: 1, fontWeight: 500, color: "var(--m-ink)" }}
        >
          {label}
        </span>
        {sub && (
          <MEyebrow style={{ marginTop: 4 }}>{sub}</MEyebrow>
        )}
      </div>
    </div>
  );
}

// ── Waterfall ─────────────────────────────────────────────────────────────────

interface WaterfallRow {
  label: string;
  value: number;
  kind: "anchor" | "pos" | "neg";
}

export function MWaterfall({
  rows,
  w = 600,
  h = 220,
  color,
}: {
  rows: WaterfallRow[];
  w?: number;
  h?: number;
  color?: string;
}) {
  const c = color ?? "var(--m-accent)";
  let running = 0;
  const bars = rows.map((r) => {
    if (r.kind === "anchor") {
      running = r.value;
      return { ...r, base: 0, top: r.value };
    }
    const start = running;
    running += r.value;
    return {
      ...r,
      base: Math.min(start, running),
      top: Math.max(start, running),
    };
  });
  const maxV = Math.max(...bars.map((b) => b.top)) * 1.08;
  const pad = 8;
  const gap = 16;
  const bw = (w - pad * 2 - gap * (bars.length - 1)) / bars.length;
  const Y = (v: number) => h - 22 - (v / maxV) * (h - 40);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      {bars.map((b, i) => {
        const x = pad + i * (bw + gap);
        const y = Y(b.top);
        const barH = Math.max(2, Y(b.base) - Y(b.top));
        const isAnchor = b.kind === "anchor";
        const fill = isAnchor
          ? "var(--m-ink-faint)"
          : b.value >= 0
          ? c
          : "var(--m-neg)";
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={barH}
              rx="2"
              fill={fill}
              opacity={isAnchor ? 0.55 : 0.92}
            />
            <text
              x={x + bw / 2}
              y={h - 6}
              textAnchor="middle"
              style={{
                fontSize: 9,
                fill: "var(--m-ink-faint)",
                fontFamily: "var(--m-mono)",
                letterSpacing: "0.04em",
              }}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

export function MHeatmap({
  rows,
  cols,
  grid,
  color,
}: {
  rows: string[];
  cols: string[];
  grid: number[][];
  color?: string;
}) {
  const c = color ?? "var(--m-accent)";
  const max = Math.max(...grid.flat());
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `78px repeat(${cols.length}, 1fr)`,
        gap: 3,
        alignItems: "center",
      }}
    >
      <span />
      {cols.map((m, i) => (
        <span key={i} className="m-eyebrow" style={{ fontSize: 8.5, textAlign: "center" }}>
          {m[0]}
        </span>
      ))}
      {rows.map((rname, ri) => (
        <>
          <span key={`label-${ri}`} style={{ fontSize: 11, color: "var(--m-ink-dim)" }}>
            {rname}
          </span>
          {grid[ri].map((v, ci) => (
            <div
              key={`cell-${ri}-${ci}`}
              title={`${rname} · ${cols[ci]}: ${v}`}
              style={{
                aspectRatio: "1.6",
                borderRadius: 3,
                background: c,
                opacity: 0.12 + (v / max) * 0.8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="m-mono"
                style={{
                  fontSize: 8.5,
                  color:
                    v / max > 0.55
                      ? "var(--m-accent-ink)"
                      : "var(--m-ink-faint)",
                  fontWeight: 600,
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </>
      ))}
    </div>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────

export function MFunnel({
  rows,
  color,
}: {
  rows: Array<{ stage: string; value: number; n?: number }>;
  color?: string;
}) {
  const c = color ?? "var(--m-accent)";
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((r, i) => {
        const w = 30 + (r.value / max) * 70;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 92, fontSize: 12, color: "var(--m-ink-dim)" }}>
              {r.stage}
            </span>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: w + "%",
                  height: 30,
                  background: `linear-gradient(90deg, ${c}, ${c})`,
                  opacity: 0.35 + (i / rows.length) * 0.55,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 12,
                  transition: "width .6s",
                }}
              >
                <span
                  className="m-mono m-tnum"
                  style={{ fontSize: 11, color: "var(--m-ink)" }}
                >
                  {r.value}M
                </span>
              </div>
              {r.n !== undefined && (
                <span
                  className="m-mono m-tnum"
                  style={{ fontSize: 10.5, color: "var(--m-ink-faint)" }}
                >
                  {r.n}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Vertical mini-bars ────────────────────────────────────────────────────────

export function MVBars({
  data,
  color,
  h = 44,
}: {
  data: number[];
  color?: string;
  h?: number;
}) {
  const c = color ?? "var(--m-accent)";
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: h }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: (v / max) * 100 + "%",
            background: c,
            opacity: 0.35 + (i / data.length) * 0.6,
            borderRadius: "2px 2px 0 0",
          }}
        />
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

export function MLegend({
  color,
  dashed,
  label,
}: {
  color?: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span
        style={{
          width: 16,
          height: 0,
          borderTop: dashed
            ? "1.5px dashed var(--m-ink-faint)"
            : "2px solid " + (color ?? "var(--m-accent)"),
        }}
      />
      <MEyebrow style={{ fontSize: 9 }}>{label}</MEyebrow>
    </span>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

export function MSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 36,
            borderRadius: "var(--m-r-sm)",
            background: "var(--m-surface-2)",
            animation: "pulse 1.5s ease-in-out infinite",
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export function MFoot() {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px var(--m-gut, 28px)",
        borderTop: "1px solid var(--m-line)",
        marginTop: "var(--m-gut, 28px)",
      }}
    >
      <MEyebrow style={{ fontSize: 8.5 }}>
        Doppel Resource Intelligence · Confidencial
      </MEyebrow>
      <MEyebrow style={{ fontSize: 8.5 }}>
        {new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </MEyebrow>
    </footer>
  );
}
