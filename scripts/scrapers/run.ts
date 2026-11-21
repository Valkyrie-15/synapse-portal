/**
 * Scrapes live claim figures from provider portals into PortalStats, one record per
 * insurer + TPA combination at a hospital (an insurer's own "Self" channel is a combination too).
 *
 *   npm run scrape                                   every combination, every hospital (the daily run);
 *                                                    hospitals with no stored login for a portal are skipped
 *   npm run scrape -- IHX FHPL                       only combinations on these portals
 *   npm run scrape -- --hospital AJINKYATARA
 *   npm run scrape -- --insurer HDFC_ERGO --tpa MEDI_ASSIST     one combination
 *   npm run scrape -- --insurer HDFC_ERGO --tpa HDFC_ERGO       HDFC Ergo's own ("Self") channel
 *   npm run scrape -- --inspect                      also save a screenshot after login to logs/scrape-inspect/
 *   npm run scrape -- --headed                       show the browser
 *   npm run scrape -- --dry-run                      print results without saving
 *
 * Logins come from the hospital's insurer/TPA rows (portalUsername/portalPassword) for the
 * portal's host, falling back to <PREFIX>_PORTAL_USERNAME/_PASSWORD in .env.local for the
 * hospital named by SCRAPER_ENV_HOSPITAL (default AJINKYATARA). Each portal is logged into once
 * per run and every combination on it is read in that session.
 *
 * Needs a browser: run `npx playwright install chromium` once, or set PLAYWRIGHT_CHANNEL=chrome
 * in .env.local to use the installed Google Chrome.
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
const option = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const hospitalArg = option("hospital")?.toUpperCase();
const insurerArg = option("insurer")?.toUpperCase();
const tpaArg = option("tpa")?.toUpperCase();
// One specific combination was asked for (a manual run) rather than the daily sweep of everything
const TARGETED = !!(insurerArg && tpaArg);
const optionValues = ["hospital", "insurer", "tpa"].map((n) => option(n));
const portalArgs = args.filter((a) => !a.startsWith("--") && !optionValues.includes(a)).map((a) => a.toUpperCase());

interface Combo {
  portal: string;
  insurer: { id: string; code: string; name: string };
  /** The TPA row, or the insurer's own row for its direct ("Self") channel */
  channel: { id: string; code: string; name: string };
  isSelf: boolean;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/** Every insurer + TPA combination at a hospital whose channel uses a portal we know. */
async function combosForHospital(hospitalId: string): Promise<Combo[]> {
  const insurers = await db.insurer.findMany({
    where: { hospitalId, kind: "INSURER", isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, code: true, name: true, portalUrl: true, selfChannel: true,
      tpas: { where: { isActive: true, hospitalId }, orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true, portalUrl: true } },
    },
  });
  const combos: Combo[] = [];
  for (const ins of insurers) {
    const insurer = { id: ins.id, code: ins.code, name: ins.name };
    const channels = [
      ...(ins.selfChannel ? [{ ...insurer, portalUrl: ins.portalUrl, isSelf: true }] : []),
      ...ins.tpas.map((t) => ({ id: t.id, code: t.code, name: t.name, portalUrl: t.portalUrl, isSelf: false })),
    ];
    for (const ch of channels) {
      const portal = portalForUrl(ch.portalUrl);
      if (portal) combos.push({ portal: portal.key, insurer, channel: { id: ch.id, code: ch.code, name: ch.name }, isSelf: ch.isSelf });
    }
  }
  return combos;
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

async function save(hospitalId: string, combo: Combo, data: Record<string, unknown>) {
  if (flag("dry-run")) {
    log(`    (dry run) ${combo.insurer.code} via ${combo.channel.code}: would save ${JSON.stringify(data)}`);
    return;
  }
  const checkedAt = new Date();
  await db.portalStats.upsert({
    where: { hospitalId_insurerId_tpaId: { hospitalId, insurerId: combo.insurer.id, tpaId: combo.channel.id } },
    update: { ...data, checkedAt },
    create: { hospitalId, insurerId: combo.insurer.id, tpaId: combo.channel.id, portal: combo.portal, ...data, checkedAt },
  });
}

const firstLine = (err: unknown) => (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 300);

/** Logs into one portal once and records the figures for each of the given combinations. */
async function runPortal(hospital: { id: string; code: string }, scraper: PortalScraper, combos: Combo[]): Promise<boolean> {
  const portal = PORTALS.find((p) => p.key === scraper.key)!;
  const creds = await findCredentials(hospital.id, hospital.code, scraper);
  if (!creds) {
    if (!TARGETED) {
      // Unattended "all" run: a hospital without a login for this portal simply isn't scraped,
      // so its existing figures (e.g. a demo hospital's) are left alone.
      log(`${hospital.code} / ${portal.label}: no login stored, skipped`);
      return true;
    }
    log(`${hospital.code} / ${portal.label}: no login stored`);
    for (const combo of combos) await save(hospital.id, combo, { status: "ERROR", message: "No login is stored for this portal" });
    return false;
  }

  log(`${hospital.code} / ${portal.label}: logging in for ${combos.length} combination(s)...`);
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
      for (const combo of combos) await save(hospital.id, combo, { status: "NO_PARSER", message: "Logged in; dashboard reader not written yet" });
      log(`  login OK; no dashboard reader for this portal yet`);
      return true;
    }

    let ok = true;
    for (const combo of combos) {
      const label = `${combo.insurer.code} via ${combo.isSelf ? "SELF" : combo.channel.code}`;
      try {
        const { stats, scope } = await scraper.readStats(page, {
          insurerName: combo.insurer.name,
          channelName: combo.isSelf ? combo.insurer.name : combo.channel.name,
          isSelf: combo.isSelf,
        });
        const clean = Object.fromEntries(Object.entries(stats).filter(([, v]) => typeof v === "number" && Number.isFinite(v)));
        await save(hospital.id, combo, { ...clean, scope, status: "OK", message: null, scrapedAt: new Date() });
        log(`  ${label}: ${scope} ${JSON.stringify(clean)}`);
      } catch (err) {
        ok = false;
        // Keep the last good numbers; only record that this attempt failed
        await save(hospital.id, combo, { status: "ERROR", message: firstLine(err) });
        log(`  ${label}: FAILED: ${firstLine(err)}`);
      }
    }
    return ok;
  } catch (err) {
    // The login itself failed (wrong password, OTP/captcha, site down): every combination on this portal is affected
    const blocked = err instanceof BlockedError;
    for (const combo of combos) await save(hospital.id, combo, { status: blocked ? "BLOCKED" : "ERROR", message: firstLine(err) });
    log(`  ${blocked ? "BLOCKED" : "FAILED"}: ${firstLine(err)}`);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!!insurerArg !== !!tpaArg) throw new Error("Give both --insurer and --tpa (use the same code twice for an insurer's own channel)");
  const unknown = portalArgs.filter((k) => !SCRAPERS.some((s) => s.key === k));
  if (unknown.length) throw new Error(`Unknown portal(s): ${unknown.join(", ")}. Known: ${SCRAPERS.map((s) => s.key).join(", ")}`);

  const hospitals = await db.hospital.findMany({
    where: { isActive: true, ...(hospitalArg ? { code: hospitalArg } : {}) },
    select: { id: true, code: true },
  });

  let ok = true;
  let matched = 0;
  for (const hospital of hospitals) {
    let combos = await combosForHospital(hospital.id);
    if (insurerArg && tpaArg) combos = combos.filter((c) => c.insurer.code === insurerArg && c.channel.code === tpaArg);
    for (const scraper of SCRAPERS) {
      if (portalArgs.length && !portalArgs.includes(scraper.key)) continue;
      const forPortal = combos.filter((c) => c.portal === scraper.key);
      if (forPortal.length === 0) continue;
      matched += forPortal.length;
      ok = (await runPortal(hospital, scraper, forPortal)) && ok;
    }
  }
  if (matched === 0) {
    log("No matching insurer + TPA combination found for a supported portal");
    ok = false;
  }
  if (!ok) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Scrape run failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
