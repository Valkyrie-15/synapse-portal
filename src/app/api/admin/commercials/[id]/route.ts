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
  const { category, description, discountPercent, packageRate, notes } = body;

  const commercial = await db.commercial.update({
    where: { id },
    data: { category, description, discountPercent, packageRate, notes },
  });

  return NextResponse.json({ commercial });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.commercial.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
