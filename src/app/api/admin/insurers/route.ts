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

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hospitalId = request.nextUrl.searchParams.get("hospitalId");
  const insurers = await db.insurer.findMany({
    where: hospitalId ? { hospitalId } : undefined,
    orderBy: [{ hospital: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      hospital: { select: { id: true, name: true, code: true } },
      _count: { select: { documents: true, contacts: true } },
      tpas: { select: { id: true } },
    },
  });

  return NextResponse.json({ insurers });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, code, portalUrl, logoUrl, sortOrder, portalUsername, portalPassword, hospitalId } = body;
  const kind = body.kind ?? "INSURER";

  if (!name || !code || !hospitalId) {
    return NextResponse.json({ error: "Hospital, name and code are required" }, { status: 400 });
  }
  if (!(await db.hospital.findUnique({ where: { id: hospitalId } }))) {
    return NextResponse.json({ error: "Hospital not found" }, { status: 400 });
  }
  if (await db.insurer.findUnique({ where: { hospitalId_code: { hospitalId, code } } })) {
    return NextResponse.json({ error: `Code ${code} already exists for this hospital` }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Type must be INSURER or TPA" }, { status: 400 });
  }

  // Only insurers have TPAs or a "Self" channel
  const isInsurer = kind === "INSURER";
  const tpaIds = isInsurer ? await sameHospitalTpaIds(hospitalId, body.tpaIds) : [];

  const insurer = await db.insurer.create({
    data: {
      name, code, portalUrl, logoUrl, sortOrder: sortOrder ?? 0, portalUsername, portalPassword,
      hospitalId,
      kind,
      selfChannel: isInsurer && !!body.selfChannel,
      tpas: { connect: tpaIds.map((id) => ({ id })) },
    },
  });

  return NextResponse.json({ insurer }, { status: 201 });
}
