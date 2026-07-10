import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
    include: { _count: { select: { documents: true, contacts: true } } },
  });

  return NextResponse.json({ insurers });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, code, portalUrl, logoUrl, sortOrder } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const insurer = await db.insurer.create({
    data: { name, code, portalUrl, logoUrl, sortOrder: sortOrder ?? 0 },
  });

  return NextResponse.json({ insurer }, { status: 201 });
}
