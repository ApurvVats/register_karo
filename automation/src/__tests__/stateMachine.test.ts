import { StateMachine, TRANSITIONS } from "../stateMachine";
import type { JobPhase } from "@itr/shared";

describe("StateMachine", () => {
  it("starts in IDLE by default", () => {
    expect(new StateMachine().phase).toBe("IDLE");
  });

  it("IDLE → NAVIGATING", () => {
    const sm = new StateMachine();
    const prev = sm.transition("NAVIGATING");
    expect(prev).toBe("IDLE");
    expect(sm.phase).toBe("NAVIGATING");
  });

  it("CAPTCHA retry loop", () => {
    const sm = new StateMachine("CAPTCHA_SOLVING");
    sm.transition("CAPTCHA_FAILED");
    sm.transition("CAPTCHA_SOLVING");
    expect(sm.phase).toBe("CAPTCHA_SOLVING");
  });

  it("full happy path to SUCCESS", () => {
    const sm = new StateMachine();
    const path: JobPhase[] = ["NAVIGATING","CAPTCHA_SOLVING","OTP_AWAITED","OTP_RECEIVED","SETTING_PASSWORD","SUCCESS"];
    path.forEach(p => sm.transition(p));
    expect(sm.phase).toBe("SUCCESS");
  });

  it("IDLE → SUCCESS throws", () => {
    expect(() => new StateMachine().transition("SUCCESS")).toThrow(/Invalid transition/);
  });

  it("SUCCESS is terminal", () => {
    expect(new StateMachine("SUCCESS").isTerminal).toBe(true);
  });

  it("FAILED is terminal", () => {
    expect(new StateMachine("FAILED").isTerminal).toBe(true);
  });

  it("terminal → anything throws", () => {
    expect(() => new StateMachine("SUCCESS").transition("NAVIGATING")).toThrow(/terminal state/);
  });

  it("canTransition returns false for invalid", () => {
    expect(new StateMachine("OTP_AWAITED").canTransition("SUCCESS")).toBe(false);
  });

  it("history records transitions", () => {
    const sm = new StateMachine();
    sm.transition("NAVIGATING");
    expect(sm.history[0]).toMatchObject({ from: "IDLE", to: "NAVIGATING" });
  });

  it("every phase has a TRANSITIONS entry", () => {
    const all: JobPhase[] = ["IDLE","NAVIGATING","CAPTCHA_SOLVING","CAPTCHA_FAILED","OTP_AWAITED","OTP_RECEIVED","SETTING_PASSWORD","SUCCESS","FAILED","CANCELLED"];
    all.forEach(p => expect(TRANSITIONS).toHaveProperty(p));
  });
});