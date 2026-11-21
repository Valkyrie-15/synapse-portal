import { db } from "@/lib/db";
import { isSuperAdmin, type AuthContext } from "@/lib/auth";
import { portalForUrl, type PortalInfo } from "@/lib/portals";

/** A run that hasn't reported back after this long is treated as failed. */
export const SCRAPE_TIMEOUT_MS = 8 * 60 * 1000;
/** Minimum gap between two "Get data" presses for the same insurer + TPA combination. */
export const COOLDOWN_MS = 60 * 1000;

/**
 * One insurer + TPA combination at a hospital. `channelId` is the TPA row, or the insurer's own
 * id for its direct ("Self") channel. Figures are stored and updated separately per combination.
 */
export interface ScrapeTarget {
  hospitalId: string;
  hospitalCode: string;
  insurerId: string;
  insurerCode: string;
  channelId: string;
  channelCode: string;
  portal: PortalInfo;
}

export function comboKey(t: { hospitalId: string; insurerId: string; channelId: string }) {
  return { hospitalId_insurerId_tpaId: { hospitalId: t.hospitalId, insurerId: t.insurerId, tpaId: t.channelId } };
}

/**
 * The combination and its portal, if the caller may see it and it really exists: the insurer is in
 * the caller's hospital and the TPA is mapped to it (or the channel is the insurer's own).
 */
export async function findScrapeTarget(ctx: AuthContext, insurerId: string, channelId: string): Promise<ScrapeTarget | null> {
  const insurer = await db.insurer.findFirst({
    where: { id: insurerId, kind: "INSURER", isActive: true, ...(isSuperAdmin(ctx.role) ? {} : { hospitalId: ctx.hospitalId ?? "" }) },
    select: {
      id: true, code: true, hospitalId: true, selfChannel: true, portalUrl: true,
      hospital: { select: { code: true } },
      tpas: { where: { isActive: true }, select: { id: true, code: true, hospitalId: true, portalUrl: true } },
    },
  });
  if (!insurer) return null;

  let channel: { id: string; code: string; portalUrl: string | null } | undefined;
  if (channelId === insurer.id) {
    if (insurer.selfChannel) channel = insurer;
  } else {
    channel = insurer.tpas.find((t) => t.id === channelId && t.hospitalId === insurer.hospitalId);
  }
  if (!channel) return null;

  const portal = portalForUrl(channel.portalUrl);
  if (!portal) return null;
  return {
    hospitalId: insurer.hospitalId,
    hospitalCode: insurer.hospital.code,
    insurerId: insurer.id,
    insurerCode: insurer.code,
    channelId: channel.id,
    channelCode: channel.code,
    portal,
  };
}

/** The scraper logs in with a login stored on one of the hospital's rows for that portal. */
export async function hasStoredLogin(hospitalId: string, portal: PortalInfo): Promise<boolean> {
  const rows = await db.insurer.findMany({
    where: { hospitalId, isActive: true, portalUrl: { not: null }, portalUsername: { not: null }, portalPassword: { not: null } },
    select: { portalUrl: true },
  });
  return rows.some((r) => portalForUrl(r.portalUrl)?.key === portal.key);
}

/** Marks a run that never reported back as failed, so the page doesn't wait forever. */
export async function expireStaleRun(t: { hospitalId: string; insurerId: string; channelId: string }) {
  await db.portalStats.updateMany({
    where: {
      hospitalId: t.hospitalId, insurerId: t.insurerId, tpaId: t.channelId,
      status: "RUNNING", requestedAt: { lt: new Date(Date.now() - SCRAPE_TIMEOUT_MS) },
    },
    data: { status: "ERROR", message: "The update didn't finish in time. Please try again." },
  });
}

type StatsRow = {
  scope: string;
  pending: number | null; approved: number | null; queries: number | null; rejected: number | null;
  dischargePending: number | null; enhancementPending: number | null;
  status: string; message: string | null; scrapedAt: Date | null; checkedAt: Date; requestedAt: Date | null;
};

/** The fields of a stats row that are safe to send to the browser. */
export function toPublicStats(row: StatsRow | null) {
  return (
    row && {
      scope: row.scope,
      pending: row.pending,
      approved: row.approved,
      queries: row.queries,
      rejected: row.rejected,
      dischargePending: row.dischargePending,
      enhancementPending: row.enhancementPending,
      status: row.status,
      message: row.message,
      scrapedAt: row.scrapedAt,
      checkedAt: row.checkedAt,
      requestedAt: row.requestedAt,
    }
  );
}

export function isScrapeConfigured(): boolean {
  return !!(process.env.SCRAPE_GITHUB_TOKEN && process.env.SCRAPE_GITHUB_REPO);
}

/**
 * Starts the "Scrape portal figures" workflow on GitHub Actions for one insurer + TPA combination.
 * The token only ever stays on the server and is never logged.
 */
export async function dispatchScrape(t: ScrapeTarget): Promise<boolean> {
  const api = process.env.SCRAPE_GITHUB_API || "https://api.github.com";
  try {
    const res = await fetch(`${api}/repos/${process.env.SCRAPE_GITHUB_REPO}/actions/workflows/scrape.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SCRAPE_GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: process.env.SCRAPE_WORKFLOW_REF || "main",
        inputs: { portal: t.portal.key, hospital: t.hospitalCode, insurer: t.insurerCode, tpa: t.channelCode },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 204) return true;
    console.error(`Starting the scrape workflow failed (HTTP ${res.status})`);
  } catch (err) {
    console.error("Starting the scrape workflow failed:", err instanceof Error ? err.message : "unknown error");
  }
  return false;
}
