"use client";
import { ChartBar, List, Lightning, Circle } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JobPhase } from "../../shared/types";

export function Sidebar() {
  const path = usePathname();
  const links = [
    { href: "/",          icon: Lightning, label: "New Run"  },
    { href: "/dashboard", icon: List,      label: "All Runs" },
    { href: "/dashboard#metrics", icon: ChartBar, label: "Metrics" },
  ];
  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#111", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #222" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lightning size={18} color="#fff" weight="fill" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>ITR Engine</div>
            <div style={{ color: "#555", fontSize: 11 }}>RegisterKaro</div>
          </div>
        </div>
      </div>
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {links.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== "/" && path.startsWith(href.split("#")[0]));
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", color: active ? "#fff" : "#888", background: active ? "#1e1e1e" : "transparent", borderLeft: active ? "2px solid var(--orange)" : "2px solid transparent", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                <Icon size={16} weight={active ? "fill" : "regular"} />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid #222" }}>
        <div style={{ color: "#444", fontSize: 11 }}>v1.0.0 · production</div>
      </div>
    </aside>
  );
}

const PHASE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  IDLE:             { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
  NAVIGATING:       { bg: "#EFF6FF", color: "#2563EB", dot: "#3B82F6" },
  CAPTCHA_SOLVING:  { bg: "#FFFBEB", color: "#D97706", dot: "#F59E0B" },
  CAPTCHA_FAILED:   { bg: "#FEF2F2", color: "#DC2626", dot: "#EF4444" },
  OTP_AWAITED:      { bg: "#FFF4EE", color: "#F26522", dot: "#F26522" },
  OTP_RECEIVED:     { bg: "#F0FDF4", color: "#16A34A", dot: "#22C55E" },
  SETTING_PASSWORD: { bg: "#F5F3FF", color: "#7C3AED", dot: "#8B5CF6" },
  SUCCESS:          { bg: "#F0FDF4", color: "#16A34A", dot: "#16A34A" },
  FAILED:           { bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
  CANCELLED:        { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
};

export function PhaseBadge({ phase }: { phase: JobPhase }) {
  const s = PHASE_STYLE[phase] ?? PHASE_STYLE.IDLE;
  const isLive = ["NAVIGATING","CAPTCHA_SOLVING","OTP_AWAITED","OTP_RECEIVED","SETTING_PASSWORD"].includes(phase);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Circle size={7} weight="fill" color={s.dot} style={isLive ? { animation: "pulse-dot 1.4s ease-in-out infinite" } : {}} />
      {phase.replace("_", " ")}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    info:  { color: "#2563EB", bg: "#EFF6FF" },
    warn:  { color: "#D97706", bg: "#FFFBEB" },
    error: { color: "#DC2626", bg: "#FEF2F2" },
    debug: { color: "#6B7280", bg: "#F3F4F6" },
  };
  const s = map[level] ?? map.info;
  return (
    <span style={{ padding: "1px 7px", borderRadius: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
      {level}
    </span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid var(--border)", background: "var(--white)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span style={{ display: "inline-block", width: size, height: size, border: "2px solid var(--border)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
}

export function fmtDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour12: false });
}