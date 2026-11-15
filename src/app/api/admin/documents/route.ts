import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";

// Admin APIs are for super admins only; the role is read from the database, not the token
async function requireAdmin() {
  const ctx = await getAuthContext();
  return ctx && isSuperAdmin(ctx.role) ? ctx : null;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");

  const documents = await db.document.findMany({
    where: insurerId ? { insurerId } : undefined,
    include: { insurer: { select: { name: true, hospital: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { insurerId, type, title, url } = body;

  if (!insurerId || !type || !title || !url) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const document = await db.document.create({
    data: { insurerId, type: type as string, title, url },
  });

  return NextResponse.json({ document }, { status: 201 });
}
