import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, isSuperAdmin } from "@/lib/auth";

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
  const { type, title, url, isActive } = body;

  const document = await db.document.update({
    where: { id },
    data: { type: type as string, title, url, isActive },
  });

  return NextResponse.json({ document });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
