const { chromium } = require("playwright");
const { StateMachine } = require("./stateMachine");
const { pushEvent, pollOtp } = require("./webhook/client");
const { config } = require("./config");

const OTP_POLL_INTERVAL_MS = 3_000;
const OTP_TIMEOUT_MS = 5 * 60 * 1000;

async function emit(jobId: string, sm: any, payload: any) {
  await pushEvent({ jobId, phase: sm.phase, ...payload });
}

async function runBot(jobId: string, pan: string): Promise<void> {
  const sm = new StateMachine("IDLE");
  let browser: any = null;

  try {
    sm.transition("NAVIGATING");
    await emit(jobId, sm, { level: "info", step: "BROWSER_LAUNCH", message: "Launching browser" });

    browser = await chromium.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--start-maximized",
      ]
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
    });

    const page = await context.newPage();

    await page.goto(config.itrPortalUrl, { waitUntil: "networkidle", timeout: 30000 });
    await emit(jobId, sm, { level: "info", step: "PORTAL_OPENED", message: "Opened Income Tax portal" });

    // Register button click
    await page.click("text=Register");
    await page.waitForLoadState("networkidle");
    await emit(jobId, sm, { level: "info", step: "REGISTER_CLICKED", message: "Navigated to Register page" });

    // PAN fill
    await page.fill('input[name="panNumber"], input[placeholder*="PAN"], #panNo', pan);
    await emit(jobId, sm, { level: "info", step: "PAN_ENTERED", message: `PAN entered (${pan.slice(0,5)}****${pan.slice(-1)})` });

    await page.click('button[type="submit"], button:has-text("Continue"), button:has-text("Validate")');
    await page.waitForLoadState("networkidle");

    // CAPTCHA
    sm.transition("CAPTCHA_SOLVING");
    await emit(jobId, sm, { level: "info", step: "CAPTCHA_DETECTED", message: "CAPTCHA detected, attempting to solve" });

    let captchaSolved = false;
    let captchaAttempts = 0;
    const MAX_CAPTCHA = 3;

    while (!captchaSolved && captchaAttempts < MAX_CAPTCHA) {
      captchaAttempts++;
      try {
        const captchaText = await solveCaptcha(page);
        if (!captchaText) throw new Error("Could not read CAPTCHA");

        await page.fill('input[name="captcha"], input[placeholder*="captcha" i], #captcha', captchaText);
        await page.click('button[type="submit"], button:has-text("Continue")');
        await page.waitForLoadState("networkidle");

        const errorMsg = await page.locator('.error, .alert-danger').isVisible().catch(() => false);
        if (errorMsg) throw new Error("CAPTCHA rejected by portal");

        captchaSolved = true;
        await emit(jobId, sm, { level: "info", step: "CAPTCHA_SOLVED", message: `CAPTCHA solved on attempt ${captchaAttempts}` });
      } catch (e) {
        sm.transition("CAPTCHA_FAILED");
        await emit(jobId, sm, { level: "warn", step: "CAPTCHA_RETRY", message: `CAPTCHA failed (attempt ${captchaAttempts}/${MAX_CAPTCHA}), retrying` });

        if (captchaAttempts < MAX_CAPTCHA) {
          sm.transition("CAPTCHA_SOLVING");
          await page.waitForTimeout(1000);
        } else {
          throw new Error("CAPTCHA failed after maximum attempts");
        }
      }
    }

    // OTP
    sm.transition("OTP_AWAITED");
    await emit(jobId, sm, { level: "info", step: "OTP_AWAITED", message: "Portal sent OTP to registered mobile. Waiting for operator to submit OTP." });

    const otp = await waitForOtp(jobId);
    if (!otp) throw new Error("OTP not received within timeout");

    sm.transition("OTP_RECEIVED");
    await emit(jobId, sm, { level: "info", step: "OTP_RECEIVED", message: "OTP received from operator" });

    await page.fill('input[name="otp"], input[placeholder*="OTP" i], #otp', otp);
    await page.click('button[type="submit"], button:has-text("Verify"), button:has-text("Continue")');
    await page.waitForLoadState("networkidle");

    const otpError = await page.locator('.error, text=Invalid OTP').isVisible().catch(() => false);
    if (otpError) throw new Error("OTP rejected by portal");

    // Password
    sm.transition("SETTING_PASSWORD");
    await emit(jobId, sm, { level: "info", step: "PASSWORD_SETTING", message: "Setting password on portal" });

    const password = generatePassword();
    await page.fill('input[name="password"], input[type="password"]', password);
    const confirmField = page.locator('input[name="confirmPassword"], input[name="confirm_password"]');
    if (await confirmField.isVisible().catch(() => false)) await confirmField.fill(password);

    await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Register")');
    await page.waitForLoadState("networkidle");

    const userId = await page.locator('.user-id, #userId').textContent().catch(() => null);

    sm.transition("SUCCESS");
    await emit(jobId, sm, { level: "info", step: "SUCCESS", message: "Credentials generated successfully" });

    await pushEvent({
      jobId, phase: "SUCCESS", level: "info", step: "CREDENTIALS_READY",
      message: "Credentials saved (encrypted)",
      meta: { credentials: { userId: userId?.replace(/\s+/g, "") ?? "UNKNOWN", password } },
    });

  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    if (sm.canTransition("FAILED")) sm.transition("FAILED");
    await pushEvent({
      jobId, phase: "FAILED", level: "error",
      step: "RUN_FAILED", message: `Run failed: ${message}`
    }).catch(() => {});
  } finally {
    try { await browser?.close(); } catch { /* ignore */ }
  }
}

async function waitForOtp(jobId: string): Promise<string | null> {
  const deadline = Date.now() + OTP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const otp = await pollOtp(jobId);
    if (otp) return otp;
    await new Promise((r) => setTimeout(r, OTP_POLL_INTERVAL_MS));
  }
  return null;
}

async function solveCaptcha(page: any): Promise<string | null> {
  // TODO: integrate 2captcha
  return null;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$%";
  const all = upper + lower + digits + special;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const core = Array.from({ length: 8 }, () => rand(all)).join("");
  return rand(upper) + rand(lower) + rand(digits) + rand(special) + core;
}

module.exports = { runBot };