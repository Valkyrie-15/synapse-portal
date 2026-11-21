/**
 * Pilot scraper: Vitraya provider portal (vhi.vitraya.com).
 *
 * Logs into the portal with a real browser, reads claim counts off the
 * dashboard, and upserts them into the ClaimsStats table for the VITRAYA
 * insurer row.
 *
 * STATUS: login/navigation and the field selectors below are PLACEHOLDERS.
 * Replace the marked sections with the real selectors once we have a
 * Playwright codegen recording of an actual login + claims dashboard walk.
 */
import { chromium } from "playwright";
import { db } from "../../src/lib/db";

const PORTAL_LOGIN_URL = "https://vhi.vitraya.com/";
const INSURER_CODE = "VITRAYA";
// Insurer codes are unique per hospital; the portal logins in .env.local belong to this hospital
const HOSPITAL_CODE = process.env.SCRAPER_HOSPITAL_CODE ?? "AJINKYATARA";

async function scrapeVitraya() {
  const username = process.env.VITRAYA_PORTAL_USERNAME;
  const password = process.env.VITRAYA_PORTAL_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Missing VITRAYA_PORTAL_USERNAME / VITRAYA_PORTAL_PASSWORD in environment"
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(PORTAL_LOGIN_URL);

    // --- TODO: replace with real selectors from codegen ---
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/preAuth/claims**");
    // --- end TODO ---

    // --- TODO: the portal has a "download" option after login that
    // exports claims data as a file (CSV/Excel) — prefer capturing that
    // flow over reading dashboard numbers off the DOM, since a file export
    // is far less brittle than scraping rendered stat widgets. Use
    // page.waitForEvent("download") around the click that triggers it,
    // save it to disk, then parse the file for the counts below. ---
    const stats = {
      pending: await readStat(page, "pending"),
      approved: await readStat(page, "approved"),
      queries: await readStat(page, "queries"),
      rejected: await readStat(page, "rejected"),
    };
    // --- end TODO ---

    await db.claimsStats.upsert({
      where: { insurerId: await getInsurerId(INSURER_CODE) },
      update: {
        pending: stats.pending,
        approved: stats.approved,
        queries: stats.queries,
        rejected: stats.rejected,
      },
      create: {
        insurerId: await getInsurerId(INSURER_CODE),
        pending: stats.pending,
        approved: stats.approved,
        queries: stats.queries,
        rejected: stats.rejected,
      },
    });

    console.log(`[${new Date().toISOString()}] Vitraya claims stats updated:`, stats);
  } finally {
    await browser.close();
  }
}

// Placeholder — swap for the real DOM read once selectors are known.
async function readStat(page: import("playwright").Page, _label: string): Promise<number> {
  return 0;
}

async function getInsurerId(code: string): Promise<string> {
  const insurer = await db.insurer.findFirstOrThrow({ where: { code, hospital: { code: HOSPITAL_CODE } } });
  return insurer.id;
}

scrapeVitraya()
  .catch((err) => {
    console.error("Vitraya scrape failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
