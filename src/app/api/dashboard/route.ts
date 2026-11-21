import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";
import { portalForUrl } from "@/lib/portals";
import { comboKey, toPublicStats } from "@/lib/scrape";

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");
  // When opening a TPA's page: the insurer the user came from, so figures are for that pair only
  const forInsurerId = searchParams.get("forInsurer");

  if (!insurerId) {
    return NextResponse.json({ error: "insurerId required" }, { status: 400 });
  }

  // Non-admins only see insurers of their own hospital; anything else is reported as not found
  const insurer = await db.insurer.findFirst({
    where: { id: insurerId, ...(isSuperAdmin(ctx.role) ? {} : { hospitalId: ctx.hospitalId ?? "" }) },
    select: {
      id: true,
      name: true,
      code: true,
      logoUrl: true,
      portalUrl: true,
      driveUrl: true,
      kind: true,
      selfChannel: true,
      hospitalId: true,
      tpas: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, code: true, hospitalId: true },
      },
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      documents: { where: { isActive: true } },
      contacts: true,
      commercials: true,
      claimsStats: true,
    },
  });

  if (!insurer) {
    return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
  }
  insurer.tpas = insurer.tpas.filter((t) => t.hospitalId === insurer.hospitalId);

  // Live figures belong to one insurer + TPA combination. For an insurer's own page that is its
  // direct ("Self") channel; for a TPA's page it is the (insurer, TPA) pair the user came through,
  // and only if that TPA is really mapped to that insurer. Without a combination there are none.
  let combo: { insurerId: string; channelId: string } | null = null;
  if (insurer.kind === "INSURER") {
    if (insurer.selfChannel) combo = { insurerId: insurer.id, channelId: insurer.id };
  } else if (forInsurerId) {
    const mapped = await db.insurer.findFirst({
      where: { id: forInsurerId, hospitalId: insurer.hospitalId, kind: "INSURER", isActive: true, tpas: { some: { id: insurer.id } } },
      select: { id: true },
    });
    if (mapped) combo = { insurerId: mapped.id, channelId: insurer.id };
  }

  const portal = combo ? portalForUrl(insurer.portalUrl) : null;
  let stats = null;
  if (combo && portal) {
    stats = await db.portalStats.findUnique({ where: comboKey({ hospitalId: insurer.hospitalId, ...combo }) });
  }
  const livePortal = portal ? { key: portal.key, label: portal.label, stats: toPublicStats(stats) } : null;

  return NextResponse.json({ insurer: { ...insurer, livePortal } });
}
