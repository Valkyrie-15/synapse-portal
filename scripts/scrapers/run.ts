/**
 * Scrapes live claim figures from provider portals into PortalStats.
 *
 *   npm run scrape                         all portals, all hospitals
 *   npm run scrape -- IHX FHPL             only these portals
 *   npm run scrape -- --hospital AJINKYATARA
 *   npm run scrape -- --inspect            also save a screenshot after login to logs/scrape-inspect/
 *   npm run scrape -- --headed             show the browser
 *   npm run scrape -- --dry-run            print results without saving
 *
 * Needs a browser: run `npx playwright install chromium` once, or set PLAYWRIGHT_CHANNEL=chrome
 * in .env.local to use the installed Google Chrome.
 *
 * Logins come from the hospital's insurer/TPA rows (portalUsername/portalPassword) for the
 * portal's host, falling back to <PREFIX>_PORTAL_USERNAME/_PASSWORD in .env.local for the
 * hospital named by SCRAPER_ENV_HOSPITAL (default AJINKYATARA).
 */
import { mkdir } from "fs/promises";
import path from "path";
import { chromium } from "playwright";
import { db } from "../../src/lib/db";
import { PORTALS, portalForUrl } from "../../src/lib/portals";
import { BlockedError, type Credentials, type PortalScraper } from "./portals/types";
import { ihx } from "./portals/ihx";
import { fhpl, healthIndia, volo } from "./portals/others";

const SCRAPERS: PortalScraper[] = [ihx, healthIndia, volo, fhpl];
const ENV_HOSPITAL = process.env.SCRAPER_ENV_HOSPITAL ?? "AJINKYATARA";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const hospitalArg = args.includes("--hospital") ? args[args.indexOf("--hospital") + 1] : undefined;
const portalArgs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--hospital").map((a) => a.toUpperCase());

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function findCredentials(hospitalId: string, hospitalCode: string, scraper: PortalScraper): Promise<Credentials | null> {
  const host = PORTALS.find((p) => p.key === scraper.key)!.host;
  const rows = await db.insurer.findMany({
    where: { hospitalId, isActive: true, portalUrl: { not: null } },
    select: { portalUrl: true, portalUsername: true, portalPassword: true },
  });
  const withLogin = rows.find((r) => portalForUrl(r.portalUrl)?.host === host && r.portalUsername && r.portalPassword);
  if (withLogin) return { username: withLogin.portalUsername!, password: withLogin.portalPassword! };

  if (hospitalCode === ENV_HOSPITAL) {
    const username = process.env[`${scraper.envPrefix}_PORTAL_USERNAME`];
    const password = process.env[`${scraper.envPrefix}_PORTAL_PASSWORD`];
    if (username && password) return { username, password };
  }
  return null;
}

async function save(hospitalId: string, portal: string, data: Record<string, unknown>) {
  if (flag("dry-run")) {
    log(`  (dry run) would save: ${JSON.stringify(data)}`);
    return;
  }
  const checkedAt = new Date();
  await db.portalStats.upsert({
    where: { hospitalId_portal: { hospitalId, portal } },
    update: { ...data, checkedAt },
    create: { hospitalId, portal, ...data, checkedAt },
  });
}

async function runOne(hospital: { id: string; code: string }, scraper: PortalScraper): Promise<boolean> {
  const portal = PORTALS.find((p) => p.key === scraper.key)!;
  const inUse = await db.insurer.findMany({ where: { hospitalId: hospital.id, isActive: true, portalUrl: { not: null } }, select: { portalUrl: true } });
  if (!inUse.some((r) => portalForUrl(r.portalUrl)?.key === portal.key)) return true; // hospital doesn't use this portal

  const creds = await findCredentials(hospital.id, hospital.code, scraper);
  if (!creds) {
    log(`${hospital.code} / ${portal.label}: no login stored, skipped`);
    return true;
  }

  log(`${hospital.code} / ${portal.label}: logging in...`);
  // PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome (fresh temporary profile) instead of Playwright's bundled browser
  const browser = await chromium.launch({ headless: !flag("headed"), channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30000);
    await scraper.login(page, creds);
    log(`  logged in (${page.url()})`);

    if (flag("inspect")) {
      const dir = path.join(process.cwd(), "logs", "scrape-inspect");
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, `${hospital.code}-${portal.key}.png`);
      await page.screenshot({ path: file, fullPage: true });
      log(`  screenshot saved: ${file} (may show patient data; keep it local)`);
    }

    if (!scraper.readStats) {
      await save(hospital.id, portal.key, { status: "NO_PARSER", message: "Logged in; dashboard reader not written yet" });
      log(`  login OK; no dashboard reader for this portal yet`);
      return true;
    }

    const stats = await scraper.readStats(page);
    const clean = Object.fromEntries(Object.entries(stats).filter(([, v]) => typeof v === "number" && Number.isFinite(v)));
    await save(hospital.id, portal.key, { ...clean, status: "OK", message: null, scrapedAt: new Date() });
    log(`  saved: ${JSON.stringify(clean)}`);
    return true;
  } catch (err) {
    const blocked = err instanceof BlockedError;
    const message = (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 300);
    // Keep the last good numbers; only record that this attempt failed
    await save(hospital.id, portal.key, { status: blocked ? "BLOCKED" : "ERROR", message });
    log(`  ${blocked ? "BLOCKED" : "FAILED"}: ${message}`);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  const unknown = portalArgs.filter((k) => !SCRAPERS.some((s) => s.key === k));
  if (unknown.length) throw new Error(`Unknown portal(s): ${unknown.join(", ")}. Known: ${SCRAPERS.map((s) => s.key).join(", ")}`);

  const scrapers = portalArgs.length ? SCRAPERS.filter((s) => portalArgs.includes(s.key)) : SCRAPERS;
  const hospitals = await db.hospital.findMany({
    where: { isActive: true, ...(hospitalArg ? { code: hospitalArg.toUpperCase() } : {}) },
    select: { id: true, code: true },
  });

  let ok = true;
  for (const hospital of hospitals) {
    for (const scraper of scrapers) {
      ok = (await runOne(hospital, scraper)) && ok;
    }
  }
  if (!ok) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Scrape run failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
