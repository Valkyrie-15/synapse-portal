import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const KINDS = ["INSURER", "TPA"];

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
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

  // Mapping fields are only touched when sent, so e.g. the active toggle leaves them alone.
  // A TPA has no TPAs or "Self" channel; an insurer is never listed as another insurer's TPA.
  const mapping =
    kind === "TPA"
      ? { selfChannel: false, tpas: { set: [] } }
      : {
          ...(kind === "INSURER" && { insurers: { set: [] } }),
          ...(body.selfChannel !== undefined && { selfChannel: !!body.selfChannel }),
          ...(Array.isArray(body.tpaIds) && {
            tpas: { set: body.tpaIds.filter((t: string) => t !== id).map((t: string) => ({ id: t })) },
          }),
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
