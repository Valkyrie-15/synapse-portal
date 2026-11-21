import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";
import { portalForUrl } from "@/lib/portals";

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");

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

  // Live figures scraped from this row's portal, for the same hospital
  const portal = portalForUrl(insurer.portalUrl);
  const stats = portal
    ? await db.portalStats.findUnique({ where: { hospitalId_portal: { hospitalId: insurer.hospitalId, portal: portal.key } } })
    : null;
  const livePortal = portal
    ? {
        key: portal.key,
        label: portal.label,
        scope: portal.scope,
        stats: stats && {
          pending: stats.pending,
          approved: stats.approved,
          queries: stats.queries,
          rejected: stats.rejected,
          dischargePending: stats.dischargePending,
          enhancementPending: stats.enhancementPending,
          status: stats.status,
          message: stats.message,
          scrapedAt: stats.scrapedAt,
          checkedAt: stats.checkedAt,
        },
      }
    : null;

  return NextResponse.json({ insurer: { ...insurer, livePortal } });
}
