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

  const contacts = await db.contact.findMany({
    where: insurerId ? { insurerId } : undefined,
    include: { insurer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { insurerId, name, role, email, phone, mobile } = body;

  if (!insurerId || !name || !role) {
    return NextResponse.json({ error: "insurerId, name and role are required" }, { status: 400 });
  }

  const contact = await db.contact.create({
    data: { insurerId, name, role, email, phone, mobile },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
