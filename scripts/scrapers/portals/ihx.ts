/**
 * IHX Nucleus provider portal (provider.ihx.in). No OTP/2FA on login.
 *
 * One login covers every payer on the hospital's IHX account (Medi Assist, MD India,
 * Aditya Birla, HDFC Ergo, ...), and the dashboard tiles are account-wide totals,
 * so the numbers are stored once per hospital for the IHX portal.
 *
 * Tile mapping:
 *   Queries Pending                       -> queries
 *   Approval Pending                      -> pending
 *   Awaiting Discharge (today + tomorrow) -> dischargePending
 * "Drafts Pending" has no matching field and is not stored.
 */
import type { PortalScraper } from "./types";
import { assertLoggedIn, declineCookies } from "./helpers";

export const ihx: PortalScraper = {
  key: "IHX",
  envPrefix: "IHX",
  loginUrl: "https://provider.ihx.in/",

  async login(page, { username, password }) {
    await page.goto(this.loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await declineCookies(page);
    await page.fill("#login-form_username", username);
    await page.fill("#login-form_password", password);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL("**/claims/**", { timeout: 20000 });
    } catch {
      // the SPA sometimes reaches the URL without a load event; verified below
    }
    await assertLoggedIn(page);
    if (!page.url().includes("/claims/")) {
      throw new Error(`Login did not reach the claims dashboard (stuck at ${page.url()})`);
    }
  },

  async readStats(page) {
    await page.locator(".tags-content").first().waitFor({ timeout: 20000 });
    const byLabel = await page.evaluate(() => {
      const out: Record<string, number> = {};
      for (const tile of Array.from(document.querySelectorAll(".tags-content"))) {
        const label = tile.querySelector(".tags-title-claim-view")?.textContent?.trim();
        if (!label) continue;
        const single = tile.querySelector(".tags-count-claimView")?.textContent?.trim();
        if (single) {
          out[label] = Number(single) || 0;
          continue;
        }
        const dayWise = Array.from(tile.querySelectorAll(".tags-day-wise-count")).map((el) => Number(el.textContent?.trim()) || 0);
        if (dayWise.length > 0) out[label] = dayWise.reduce((sum, n) => sum + n, 0);
      }
      return out;
    });
    return {
      queries: byLabel["Queries Pending"],
      pending: byLabel["Approval Pending"],
      dischargePending: byLabel["Awaiting Discharge"],
    };
  },
};
