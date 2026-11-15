import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sameHospitalTpaIds } from "@/lib/insurers";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";

const KINDS = ["INSURER", "TPA"];

// Admin APIs are for super admins only; the role is read from the database, not the token
async function requireAdmin() {
  const ctx = await getAuthContext();
  return ctx && isSuperAdmin(ctx.role) ? ctx : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, code, portalUrl, logoUrl, isActive, sortOrder, portalUsername, portalPassword, driveUrl, kind } = body;

  if (kind !== undefined && !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Type must be INSURER or TPA" }, { status: 400 });
  }

  // The hospital an entry belongs to never changes; TPAs are mapped only within it
  const existing = await db.insurer.findUnique({ where: { id }, select: { hospitalId: true } });
  if (!existing) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
  const tpaIds = Array.isArray(body.tpaIds)
    ? (await sameHospitalTpaIds(existing.hospitalId, body.tpaIds)).filter((t) => t !== id)
    : null;

  // Mapping fields are only touched when sent, so e.g. the active toggle leaves them alone.
  // A TPA has no TPAs or "Self" channel; an insurer is never listed as another insurer's TPA.
  const mapping =
    kind === "TPA"
      ? { selfChannel: false, tpas: { set: [] } }
      : {
          ...(kind === "INSURER" && { insurers: { set: [] } }),
          ...(body.selfChannel !== undefined && { selfChannel: !!body.selfChannel }),
          ...(tpaIds && { tpas: { set: tpaIds.map((t) => ({ id: t })) } }),
        };

  const insurer = await db.insurer.update({
    where: { id },
    data: { name, code, portalUrl, logoUrl, isActive, sortOrder, portalUsername, portalPassword, driveUrl, kind, ...mapping },
  });

  return NextResponse.json({ insurer });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.insurer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
