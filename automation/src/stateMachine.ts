import type { JobPhase } from "@itr/shared";

const TRANSITIONS: Record<JobPhase, JobPhase[]> = {
  IDLE:             ["NAVIGATING", "CANCELLED"],
  NAVIGATING:       ["CAPTCHA_SOLVING", "FAILED"],
  CAPTCHA_SOLVING:  ["CAPTCHA_FAILED", "OTP_AWAITED", "FAILED"],
  CAPTCHA_FAILED:   ["CAPTCHA_SOLVING", "FAILED"],
  OTP_AWAITED:      ["OTP_RECEIVED", "FAILED", "CANCELLED"],
  OTP_RECEIVED:     ["SETTING_PASSWORD", "FAILED"],
  SETTING_PASSWORD: ["SUCCESS", "FAILED"],
  SUCCESS:          [],
  FAILED:           [],
  CANCELLED:        [],
};

export class StateMachine {
  private _phase: JobPhase;
  private _history: { from: JobPhase; to: JobPhase; at: string }[] = [];

  constructor(initial: JobPhase = "IDLE") {
    this._phase = initial;
  }

  get phase(): JobPhase { return this._phase; }
  get history() { return [...this._history]; }
  get isTerminal(): boolean { return TRANSITIONS[this._phase].length === 0; }

  transition(next: JobPhase): JobPhase {
    const allowed = TRANSITIONS[this._phase];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid transition: ${this._phase} → ${next}. ` +
        `Allowed from ${this._phase}: [${allowed.join(", ") || "none — terminal state"}]`
      );
    }
    const prev = this._phase;
    this._phase = next;
    this._history.push({ from: prev, to: next, at: new Date().toISOString() });
    return prev;
  }

  canTransition(next: JobPhase): boolean {
    return TRANSITIONS[this._phase].includes(next);
  }
}

export { TRANSITIONS };