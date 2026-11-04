import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const KINDS = ["INSURER", "TPA"];

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const insurers = await db.insurer.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
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
  const { name, code, portalUrl, logoUrl, sortOrder, portalUsername, portalPassword } = body;
  const kind = body.kind ?? "INSURER";

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Type must be INSURER or TPA" }, { status: 400 });
  }

  // Only insurers have TPAs or a "Self" channel
  const isInsurer = kind === "INSURER";
  const tpaIds: string[] = isInsurer && Array.isArray(body.tpaIds) ? body.tpaIds : [];

  const insurer = await db.insurer.create({
    data: {
      name, code, portalUrl, logoUrl, sortOrder: sortOrder ?? 0, portalUsername, portalPassword,
      kind,
      selfChannel: isInsurer && !!body.selfChannel,
      tpas: { connect: tpaIds.map((id) => ({ id })) },
    },
  });

  return NextResponse.json({ insurer }, { status: 201 });
}
