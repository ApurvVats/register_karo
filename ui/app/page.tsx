"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightning, ArrowRight, ShieldCheck, Info } from "@phosphor-icons/react";
import { Shell, PageHeader, Spinner } from "../components/shared";
import { startJob } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [pan, setPan]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const valid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true); setError("");
    try {
      const { jobId } = await startJob(pan);
      router.push(`/run/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setLoading(false);
    }
  }

  return (
    <Shell>
      <PageHeader title="New Credential Run" subtitle="Start a new ITR portal credential generation" />
      <div style={{ padding: "40px 32px", maxWidth: 560 }}>
        <div style={{ background: "var(--orange-light)", border: "1px solid #FDDCCA", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 12, marginBottom: 32 }}>
          <Info size={18} color="var(--orange)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#7C3D1A", lineHeight: 1.6 }}>
            The bot will open the Income Tax portal, enter the PAN, solve the CAPTCHA, then pause and ask you for the OTP sent to the registered mobile.
          </div>
        </div>

        <form onSubmit={handleStart}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>PAN Number</label>
            <input
              value={pan}
              onChange={e => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              autoFocus
              style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${error ? "var(--error)" : pan && !valid ? "#F59E0B" : valid ? "var(--success)" : "var(--border)"}`, borderRadius: 8, fontSize: 16, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", outline: "none", background: "#fff", transition: "border-color 0.15s" }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: pan && !valid ? "var(--warn)" : valid ? "var(--success)" : "var(--text-muted)" }}>
              {pan.length === 0 && "Format: 5 letters · 4 digits · 1 letter  (e.g. ABCDE1234F)"}
              {pan.length > 0 && !valid && `${10 - pan.length} characters remaining`}
              {valid && "✓ Valid PAN format"}
            </div>
          </div>

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--error-bg)", border: "1px solid #FECACA", color: "var(--error)", fontSize: 13, marginBottom: 20 }}>{error}</div>}

          <button type="submit" disabled={!valid || loading} style={{ width: "100%", padding: "12px 0", background: valid && !loading ? "var(--orange)" : "var(--border)", color: valid && !loading ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: valid && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s" }}>
            {loading ? <><Spinner size={16} /> Starting run...</> : <><Lightning size={16} weight="fill" /> Start Run <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ marginTop: 28, display: "flex", alignItems: "flex-start", gap: 8, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <ShieldCheck size={16} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            PAN is masked immediately. Credentials are encrypted at rest using AES-256 and never written to logs.
          </div>
        </div>
      </div>
    </Shell>
  );
}