"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, ArrowDown, Pause, Play, Warning, Copy, WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { Shell, PageHeader, PhaseBadge, LevelBadge, Spinner, fmtTime, fmtDuration } from "../../../components/shared";
import { submitOtp, cancelJob } from "../../../lib/api";
import type { JobEvent, JobPhase } from "../../../../shared/types";

const SERVICE = process.env.NEXT_PUBLIC_SERVICE_URL  ?? "http://localhost:4000";
const TOKEN   = process.env.NEXT_PUBLIC_BEARER_TOKEN ?? "dev_bearer_token_change_in_prod";

const STEPS: { phase: JobPhase; label: string }[] = [
  { phase: "IDLE",             label: "Created"      },
  { phase: "NAVIGATING",       label: "Navigating"   },
  { phase: "CAPTCHA_SOLVING",  label: "CAPTCHA"      },
  { phase: "OTP_AWAITED",      label: "OTP Wait"     },
  { phase: "OTP_RECEIVED",     label: "OTP Received" },
  { phase: "SETTING_PASSWORD", label: "Password"     },
  { phase: "SUCCESS",          label: "Complete"     },
];
const STEP_ORDER = STEPS.map(s => s.phase);
function stepIndex(phase: JobPhase): number {
  if (phase === "FAILED" || phase === "CANCELLED") return -1;
  return STEP_ORDER.indexOf(phase);
}

export default function RunPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const [events, setEvents]       = useState<JobEvent[]>([]);
  const [phase, setPhase]         = useState<JobPhase>("IDLE");
  const [panMasked, setPan]       = useState("");
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [otp, setOtp]             = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError]   = useState("");
  const [otpSent, setOtpSent]     = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const esRef  = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${SERVICE}/jobs/${jobId}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
      .then(r => r.json()).then(({ job }) => { if (job) { setPhase(job.phase); setPan(job.pan_masked); setStartedAt(job.startedAt); } }).catch(() => {});
  }, [jobId]);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource(`${SERVICE}/jobs/${jobId}/stream`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const ev: JobEvent = JSON.parse(e.data);
        setEvents(prev => prev.some(p => p.seq === ev.seq) ? prev : [...prev, ev]);
        setPhase(ev.phase);
      } catch { /* ignore */ }
    };
    es.onerror = () => { setConnected(false); es.close(); setTimeout(connect, 3000); };
  }, [jobId]);

  useEffect(() => { connect(); return () => esRef.current?.close(); }, [connect]);
  useEffect(() => { if (autoScroll && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [events, autoScroll]);

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setOtpError("OTP must be 6 digits"); return; }
    setOtpSending(true); setOtpError("");
    try { await submitOtp(jobId, otp); setOtpSent(true); }
    catch (err) { setOtpError(err instanceof Error ? err.message : "Failed"); }
    finally { setOtpSending(false); }
  }

  const isTerminal  = ["SUCCESS","FAILED","CANCELLED"].includes(phase as string);
  const currentStep = stepIndex(phase);
  const elapsed     = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;

  return (
    <Shell>
      <PageHeader
        title={`Run ${jobId.slice(0, 18)}…`}
        subtitle={panMasked ? `PAN: ${panMasked}` : "Loading…"}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: connected ? "var(--success-bg)" : "var(--error-bg)", color: connected ? "var(--success)" : "var(--error)", fontSize: 12, fontWeight: 600 }}>
              {connected ? <><WifiHigh size={13} /> Live</> : <><WifiSlash size={13} /> Reconnecting…</>}
            </span>
            {!isTerminal && (
              <button onClick={() => cancelJob(jobId)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "#fff", color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
            )}
          </div>
        }
      />

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Phase stepper */}
        {!["FAILED","CANCELLED","SUCCESS"].includes(phase as string) ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <div style={{ position: "absolute", top: 14, left: 14, width: "calc(100% - 28px)", height: 2, background: "var(--border)", zIndex: 0 }} />
              <div style={{ position: "absolute", top: 14, left: 14, width: `${Math.max(0, currentStep / (STEPS.length - 1)) * 100}%`, height: 2, background: "var(--orange)", zIndex: 1, transition: "width 0.5s ease" }} />
              {STEPS.map((s, i) => {
                const done = i < currentStep, current = i === currentStep;
                return (
                  <div key={s.phase} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: i === 0 ? "flex-start" : i === STEPS.length - 1 ? "flex-end" : "center", position: "relative", zIndex: 2 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", border: done ? "2px solid var(--orange)" : current ? "2px solid var(--orange)" : "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                      {done ? <CheckCircle size={16} color="var(--orange)" weight="fill" /> : current ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--orange)", animation: "pulse-dot 1.4s ease-in-out infinite" }} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border)" }} />}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, fontWeight: current || done ? 600 : 400, color: current ? "var(--orange)" : done ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderRadius: 12, background: (phase as string) === "SUCCESS" ? "var(--success-bg)" : "var(--error-bg)", border: `1px solid ${(phase as string) === "SUCCESS" ? "#BBF7D0" : "#FECACA"}` }}>
            {(phase as string) === "SUCCESS" ? <CheckCircle size={24} color="var(--success)" weight="fill" /> : <XCircle size={24} color="var(--error)" weight="fill" />}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: (phase as string) === "SUCCESS" ? "var(--success)" : "var(--error)" }}>
                {(phase as string) === "SUCCESS" ? "Credentials Generated Successfully" : `Run ${phase}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Duration: {fmtDuration(elapsed)} · {events.length} events</div>
            </div>
          </div>
        )}

        {/* OTP input */}
        {phase === "OTP_AWAITED" && !otpSent && (
          <div style={{ background: "#FFF4EE", border: "1.5px solid var(--orange)", borderRadius: 12, padding: "20px 24px", animation: "slide-in 0.25s ease-out" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Warning size={18} weight="fill" /> OTP Required
            </div>
            <div style={{ fontSize: 13, color: "#7C3D1A", marginBottom: 16 }}>An OTP has been sent to the mobile number registered with this PAN. Enter it below — the bot is waiting.</div>
            <form onSubmit={handleOtp} style={{ display: "flex", gap: 10 }}>
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ""))} placeholder="6-digit OTP" maxLength={6} autoFocus
                style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${otpError ? "var(--error)" : "var(--orange)"}`, fontSize: 18, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em", width: 160, outline: "none", background: "#fff" }}
              />
              <button type="submit" disabled={otpSending || otp.length !== 6}
                style={{ padding: "10px 20px", borderRadius: 8, background: otp.length === 6 ? "var(--orange)" : "var(--border)", color: otp.length === 6 ? "#fff" : "var(--text-muted)", border: "none", fontWeight: 600, fontSize: 13, cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                {otpSending ? <><Spinner size={14} /> Sending…</> : "Submit OTP"}
              </button>
            </form>
            {otpError && <div style={{ color: "var(--error)", fontSize: 12, marginTop: 8 }}>{otpError}</div>}
          </div>
        )}

        {otpSent && phase === "OTP_AWAITED" && (
          <div style={{ background: "var(--success-bg)", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
            <CheckCircle size={16} weight="fill" /> OTP submitted — bot is processing…
          </div>
        )}

        {/* Event log */}
        <div style={{ background: "#0D1117", borderRadius: 12, border: "1px solid #21262D", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #21262D", background: "#161B22" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8B949E", fontSize: 12 }}>
              <Clock size={13} />
              <span>{events.length} events</span>
              {!isTerminal && <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#3FB950" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB950", animation: "pulse-dot 1.4s ease-in-out infinite", display: "inline-block" }} />streaming live</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAutoScroll(v => !v)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #30363D", background: autoScroll ? "#21262D" : "transparent", color: "#8B949E", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                {autoScroll ? <><Pause size={11} /> Auto-scroll</> : <><Play size={11} /> Resume</>}
              </button>
              <button onClick={() => { const text = events.map(e => `[${fmtTime(e.timestamp)}] [${e.level.toUpperCase()}] [${e.step}] ${e.message}`).join("\n"); navigator.clipboard.writeText(text); }}
                style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #30363D", background: "transparent", color: "#8B949E", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <Copy size={11} /> Copy
              </button>
            </div>
          </div>

          <div ref={logRef} style={{ height: 400, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7 }}>
            {events.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#484F58", fontSize: 13 }}>Waiting for events…</div>
            ) : (
              events.map((ev, i) => (
                <div key={ev.seq} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "5px 16px", background: ev.level === "error" ? "rgba(220,38,38,0.06)" : ev.level === "warn" ? "rgba(217,119,6,0.05)" : "transparent", borderLeft: ev.level === "error" ? "2px solid rgba(220,38,38,0.4)" : ev.level === "warn" ? "2px solid rgba(217,119,6,0.3)" : "2px solid transparent", animation: i === events.length - 1 ? "slide-in 0.2s ease-out" : "none" }}>
                  <span style={{ color: "#484F58", flexShrink: 0, marginTop: 1, fontSize: 11 }}>{fmtTime(ev.timestamp)}</span>
                  <LevelBadge level={ev.level} />
                  <span style={{ color: "#8B949E", flexShrink: 0, fontSize: 11 }}>{ev.step}</span>
                  <span style={{ color: ev.level === "error" ? "#FF7B7B" : ev.level === "warn" ? "#F0B94B" : "#E6EDF3", wordBreak: "break-word" }}>{ev.message}</span>
                </div>
              ))
            )}
          </div>

          {!autoScroll && (
            <div onClick={() => { setAutoScroll(true); logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderTop: "1px solid #21262D", background: "#161B22", color: "#8B949E", fontSize: 12, cursor: "pointer" }}>
              <ArrowDown size={12} /> New events below — click to scroll
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Current Phase", value: <PhaseBadge phase={phase} /> },
            { label: "Events",        value: events.length },
            { label: "Elapsed",       value: fmtDuration(elapsed) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}