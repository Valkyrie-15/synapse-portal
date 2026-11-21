import type { Page } from "playwright";
import { BlockedError } from "./types";

/** Clicks a "necessary cookies only"/decline option if a consent banner is showing. */
export async function declineCookies(page: Page) {
  const button = page.locator('button:has-text("Necessary"), button:has-text("Decline"), button:has-text("Reject")').first();
  try {
    await button.click({ timeout: 4000 });
  } catch {
    // no banner
  }
}

export async function settle(page: Page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    // some portals keep long-polling; carry on
  }
}

/** Throws BlockedError when the page is asking for an OTP or captcha. */
export async function assertNotBlocked(page: Page) {
  const blocker = page
    .locator(
      [
        'input[name*="otp" i]', 'input[id*="otp" i]', 'input[placeholder*="otp" i]',
        'input[name*="captcha" i]', 'input[id*="captcha" i]', 'input[placeholder*="captcha" i]',
        'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
      ].join(", ")
    )
    .first();
  if (await blocker.isVisible().catch(() => false)) {
    throw new BlockedError("The portal asked for an OTP or captcha; this login can't be automated");
  }
}

/** Throws if the password box is still on screen after submitting, i.e. the login was rejected. */
export async function assertLoggedIn(page: Page) {
  await settle(page);
  await assertNotBlocked(page);
  const passwordBox = page.locator('input[type="password"]').first();
  if (await passwordBox.isVisible().catch(() => false)) {
    throw new Error(`Login failed: still on the login page (${page.url()}). Check the stored username/password.`);
  }
}

/**
 * Generic username/password login for portals whose form we haven't mapped:
 * the first visible text/email box before the password box, then the submit button.
 */
export async function genericLogin(page: Page, username: string, password: string) {
  const passwordBox = page.locator('input[type="password"]:visible').first();
  await passwordBox.waitFor({ timeout: 30000 });
  await assertNotBlocked(page);
  const userBox = page
    .locator('input:visible:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"])')
    .first();
  await userBox.fill(username);
  await passwordBox.fill(password);
  const submit = page
    .locator('button[type="submit"]:visible, input[type="submit"]:visible, button:visible:has-text("Login"), button:visible:has-text("Log in"), button:visible:has-text("Sign in")')
    .first();
  await submit.click();
}
