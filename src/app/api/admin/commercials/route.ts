import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");

  const commercials = await db.commercial.findMany({
    where: insurerId ? { insurerId } : undefined,
    include: { insurer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ commercials });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { insurerId, category, description, discountPercent, packageRate, notes } = body;

  if (!insurerId || !category || !description) {
    return NextResponse.json({ error: "insurerId, category and description are required" }, { status: 400 });
  }

  const commercial = await db.commercial.create({
    data: { insurerId, category, description, discountPercent, packageRate, notes },
  });

  return NextResponse.json({ commercial }, { status: 201 });
}
