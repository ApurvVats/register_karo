"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise, Funnel, CheckCircle, XCircle, ArrowRight, TrendUp, Timer, ListChecks } from "@phosphor-icons/react";
import { Shell, PageHeader, PhaseBadge, Spinner, fmtDuration, fmtTime } from "../../components/shared";
import { listJobs, getMetrics } from "../../lib/api";
import type { JobListItem, MetricsResponse } from "../../../shared/types";

const POLL_MS = 5000;

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs]       = useState<JobListItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLast] = useState<Date>(new Date());
  const [phaseFilter, setPhaseFilter]     = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const [{ jobs: j }, m] = await Promise.all([
        listJobs({ phase: phaseFilter || undefined, outcome: outcomeFilter || undefined, limit: 50 }),
        getMetrics(),
      ]);
      setJobs(j); setMetrics(m); setLast(new Date());
    } catch { /* silent on background poll */ }
    finally { setLoading(false); }
  }, [phaseFilter, outcomeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, POLL_MS); return () => clearInterval(t); }, [load]);

  const hasActive = jobs.some(j => !["SUCCESS","FAILED","CANCELLED"].includes(j.phase as string));

  return (
    <Shell>
      <PageHeader
        title="All Runs"
        subtitle={`${jobs.length} runs · refreshes every ${POLL_MS / 1000}s`}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{lastRefresh.toLocaleTimeString("en-IN", { hour12: false })}</span>
            <button onClick={load} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              <ArrowClockwise size={14} /> Refresh
            </button>
          </div>
        }
      />

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Metrics strip */}
        {metrics && (
          <div id="metrics" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {[
              { label: "Total Runs",   value: metrics.totalRuns,         icon: ListChecks,  color: "var(--text-primary)" },
              { label: "Success",      value: metrics.successCount,       icon: CheckCircle, color: "var(--success)"      },
              { label: "Failed",       value: metrics.failedCount,        icon: XCircle,     color: "var(--error)"        },
              { label: "Running",      value: metrics.runningCount,       icon: Timer,       color: "var(--running)"      },
              { label: "Success Rate", value: `${metrics.successRate}%`,  icon: TrendUp,     color: "var(--orange)"       },
              { label: "p99 Duration", value: fmtDuration(metrics.p99Ms), icon: Timer,       color: "var(--text-primary)" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
                  <Icon size={14} color={color} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", border: "1px solid var(--border)", borderRadius: 10 }}>
          <Funnel size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Filter:</span>
          <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "#fff", cursor: "pointer", outline: "none" }}>
            <option value="">All phases</option>
            {["IDLE","NAVIGATING","CAPTCHA_SOLVING","OTP_AWAITED","OTP_RECEIVED","SETTING_PASSWORD","SUCCESS","FAILED","CANCELLED"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, background: "#fff", cursor: "pointer", outline: "none" }}>
            <option value="">All outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {(phaseFilter || outcomeFilter) && (
            <button onClick={() => { setPhaseFilter(""); setOutcomeFilter(""); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--error)", background: "var(--error-bg)", color: "var(--error)", fontSize: 12, cursor: "pointer" }}>Clear</button>
          )}
          {hasActive && (
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--running)", padding: "4px 10px", borderRadius: 20, background: "var(--running-bg)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--running)", animation: "pulse-dot 1.4s ease-in-out infinite", display: "inline-block" }} />
              Live runs in progress
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px", gap: 10, color: "var(--text-muted)", fontSize: 13 }}><Spinner size={18} /> Loading runs…</div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No runs yet.{" "}
              <button onClick={() => router.push("/")} style={{ color: "var(--orange)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Start the first run →</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Job ID","PAN","Phase","Started","Updated","Duration","Outcome",""].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--surface)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={job.jobId} onClick={() => router.push(`/run/${job.jobId}`)}
                    style={{ borderBottom: i < jobs.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px" }}><code style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--orange)", background: "#FFF4EE", padding: "2px 7px", borderRadius: 4 }}>{job.jobId.slice(0, 16)}…</code></td>
                    <td style={{ padding: "12px 16px" }}><code style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{job.pan_masked}</code></td>
                    <td style={{ padding: "12px 16px" }}><PhaseBadge phase={job.phase} /></td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{fmtTime(job.startedAt)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{fmtTime(job.updatedAt)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{fmtDuration(job.durationMs)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {job.outcome === "SUCCESS" && <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--success)", fontSize: 12, fontWeight: 600 }}><CheckCircle size={14} weight="fill" /> Success</span>}
                      {job.outcome === "FAILED"  && <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--error)",   fontSize: 12, fontWeight: 600 }}><XCircle size={14} weight="fill" /> Failed</span>}
                      {job.outcome === "CANCELLED" && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Cancelled</span>}
                      {!job.outcome && <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--running)", fontSize: 12 }}><Spinner size={10} /> Running</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}><ArrowRight size={14} color="var(--text-muted)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}