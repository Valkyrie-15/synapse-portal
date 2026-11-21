/**
 * IHX Nucleus provider portal (provider.ihx.in) scraper.
 *
 * This portal has no OTP/2FA on login, so it's fully automatable with just
 * a stored username/password. It's a single shared login covering 30+
 * payers on one hospital account (IHX itself, plus United India and Aditya
 * Birla in our insurer list all point at this same portal) — the dashboard
 * tiles below are account-wide totals, not broken out per payer, so this
 * scraper updates the aggregate "IHX" insurer row.
 *
 * Field mapping (best-effort — the dashboard doesn't expose everything our
 * schema has a column for, so only these are touched on each run):
 *   Queries Pending    -> queries
 *   Approval Pending   -> pending
 *   Awaiting Discharge (today + tomorrow) -> dischargePending
 * "Drafts Pending" has no matching column and is left unscraped.
 */
import { chromium } from "playwright";
import { db } from "../../src/lib/db";

const PORTAL_URL = "https://provider.ihx.in/";
const INSURER_CODE = "IHX";
// Insurer codes are unique per hospital; the portal logins in .env.local belong to this hospital
const HOSPITAL_CODE = process.env.SCRAPER_HOSPITAL_CODE ?? "AJINKYATARA";

async function scrapeIhx() {
  const username = process.env.IHX_PORTAL_USERNAME;
  const password = process.env.IHX_PORTAL_PASSWORD;

  if (!username || !password) {
    throw new Error("Missing IHX_PORTAL_USERNAME / IHX_PORTAL_PASSWORD in environment");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

    try {
      await page.click('button:has-text("Accept Necessary Cookies Only")', { timeout: 5000 });
    } catch {
      // consent banner not shown (e.g. already dismissed for this profile) — fine to continue
    }

    await page.fill("#login-form_username", username);
    await page.fill("#login-form_password", password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL("**/claims/**", { timeout: 15000 });
    } catch {
      // SPA sometimes settles on the target URL without ever firing the
      // "load" event waitForURL listens for; fall through and verify below.
    }
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      // best-effort only
    }

    if (!page.url().includes("/claims/")) {
      throw new Error(`Login did not reach the claims dashboard (stuck at ${page.url()})`);
    }

    const stats = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll(".tags-content"));
      const byLabel: Record<string, number> = {};

      for (const tile of tiles) {
        const label = tile.querySelector(".tags-title-claim-view")?.textContent?.trim();
        if (!label) continue;

        const singleCount = tile.querySelector(".tags-count-claimView")?.textContent?.trim();
        if (singleCount !== undefined && singleCount !== "") {
          byLabel[label] = Number(singleCount) || 0;
          continue;
        }

        const dayWiseCounts = Array.from(tile.querySelectorAll(".tags-day-wise-count")).map(
          (el) => Number(el.textContent?.trim()) || 0
        );
        if (dayWiseCounts.length > 0) {
          byLabel[label] = dayWiseCounts.reduce((sum, n) => sum + n, 0);
        }
      }

      return byLabel;
    });

    const queries = stats["Queries Pending"] ?? 0;
    const pending = stats["Approval Pending"] ?? 0;
    const dischargePending = stats["Awaiting Discharge"] ?? 0;

    const insurer = await db.insurer.findFirstOrThrow({ where: { code: INSURER_CODE, hospital: { code: HOSPITAL_CODE } } });

    await db.claimsStats.upsert({
      where: { insurerId: insurer.id },
      update: { queries, pending, dischargePending },
      create: { insurerId: insurer.id, queries, pending, dischargePending },
    });

    console.log(`[${new Date().toISOString()}] IHX claims stats updated:`, {
      queries,
      pending,
      dischargePending,
    });
  } finally {
    await browser.close();
  }
}

scrapeIhx()
  .catch((err) => {
    console.error("IHX scrape failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
