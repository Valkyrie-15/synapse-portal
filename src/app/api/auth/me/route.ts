import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await db.user.findUnique({
    where: { id: session.userId },
    select: { hospital: { select: { id: true, name: true, code: true, city: true, logoUrl: true } } },
  });

  return NextResponse.json({ user: session, hospital: record?.hospital ?? null });
}
