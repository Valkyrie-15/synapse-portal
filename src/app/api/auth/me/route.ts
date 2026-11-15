import { NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const hospitalFields = { id: true, name: true, code: true, city: true, logoUrl: true } as const;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, hospital: { select: hospitalFields } },
  });
  if (!record) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role comes from the database, so a changed role applies without signing in again
  const user = { ...session, role: record.role };
  // Only a super admin can switch between hospitals
  const hospitals = isSuperAdmin(record.role)
    ? await db.hospital.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: hospitalFields })
    : [];

  return NextResponse.json({ user, hospital: record.hospital ?? null, hospitals });
}
