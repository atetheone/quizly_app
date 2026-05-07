"use client";

import { type ReactNode } from "react";

const avatarPalette = ["#ffd23f","#ff5a5f","#2f3e8f","#2f9e44","#a78bfa","#fb923c","#06b6d4","#f472b6"];

export function QAvatar({ name = "?", size = 32 }: { name?: string; size?: number }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const bg = avatarPalette[name.charCodeAt(0) % avatarPalette.length];
  const dark = bg === "#2f3e8f";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: "1.5px solid var(--q-line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--q-display)", fontWeight: 700, fontSize: size * 0.4,
        background: bg, color: dark ? "#fff" : "var(--q-ink)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function QLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: size, height: size, borderRadius: 8,
          background: "var(--q-ink)", color: "var(--q-yellow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--q-display)", fontWeight: 800, fontSize: size * 0.55,
          border: "1.5px solid var(--q-line)",
          flexShrink: 0,
        }}
      >
        Q
      </div>
      <span
        style={{
          fontFamily: "var(--q-display)", fontWeight: 700,
          fontSize: size * 0.85, letterSpacing: "-0.025em",
          lineHeight: 1, color: "var(--q-ink)",
        }}
      >
        quizly
      </span>
    </div>
  );
}

export function QProgressBar({
  value, max, color = "var(--q-ink)", thin = false, style: extraStyle,
}: { value: number; max: number; color?: string; thin?: boolean; style?: React.CSSProperties }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={`q-bar${thin ? " q-bar-thin" : ""}`}
      style={extraStyle}
    >
      <span className="q-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function QCard({ children, style, className }: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`q-card${className ? " " + className : ""}`} style={style}>
      {children}
    </div>
  );
}
