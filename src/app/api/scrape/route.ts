import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import {
  COOLDOWN_MS,
  comboKey,
  dispatchScrape,
  expireStaleRun,
  findScrapeTarget,
  hasStoredLogin,
  isScrapeConfigured,
  toPublicStats,
} from "@/lib/scrape";

// "Get data" for one insurer + TPA combination. `tpaId` is the TPA's id, or the insurer's own id for
// its direct ("Self") channel. The user must belong to the hospital that owns the combination
// (or be a super admin), and the TPA must really be mapped to that insurer.

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const insurerId = typeof body?.insurerId === "string" ? body.insurerId : "";
  const tpaId = typeof body?.tpaId === "string" ? body.tpaId : "";
  const target = insurerId && tpaId ? await findScrapeTarget(ctx, insurerId, tpaId) : null;
  if (!target) return NextResponse.json({ error: "There is nothing to update for this combination." }, { status: 404 });

  if (!isScrapeConfigured()) {
    return NextResponse.json({ error: "Live updates haven't been set up for this app yet. Please contact your administrator." }, { status: 503 });
  }
  if (!(await hasStoredLogin(target.hospitalId, target.portal))) {
    return NextResponse.json({ error: `No login is stored for ${target.portal.label}. Please ask an administrator to add it.` }, { status: 400 });
  }

  const key = comboKey(target);
  await expireStaleRun(target);
  const current = await db.portalStats.findUnique({ where: key });

  // Someone already asked for this combination; join that run instead of starting another
  if (current?.status === "RUNNING") {
    return NextResponse.json({ stats: toPublicStats(current) }, { status: 202 });
  }
  if (current?.requestedAt && Date.now() - current.requestedAt.getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: "An update was just requested. Please wait a minute and try again." }, { status: 429 });
  }

  const requestedAt = new Date();
  const running = await db.portalStats.upsert({
    where: key,
    update: { status: "RUNNING", message: null, requestedAt },
    create: {
      hospitalId: target.hospitalId, insurerId: target.insurerId, tpaId: target.channelId,
      portal: target.portal.key, status: "RUNNING", requestedAt,
    },
  });

  if (!(await dispatchScrape(target))) {
    const failed = await db.portalStats.update({ where: key, data: { status: "ERROR", message: "Could not start the update." } });
    return NextResponse.json({ error: "Could not start the update. Please try again in a few minutes.", stats: toPublicStats(failed) }, { status: 502 });
  }
  return NextResponse.json({ stats: toPublicStats(running) }, { status: 202 });
}

/** Current state of the update for this combination; the page polls this while waiting. */
export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const insurerId = request.nextUrl.searchParams.get("insurerId") ?? "";
  const tpaId = request.nextUrl.searchParams.get("tpaId") ?? "";
  const target = insurerId && tpaId ? await findScrapeTarget(ctx, insurerId, tpaId) : null;
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await expireStaleRun(target);
  const row = await db.portalStats.findUnique({ where: comboKey(target) });
  return NextResponse.json({ stats: toPublicStats(row) });
}
