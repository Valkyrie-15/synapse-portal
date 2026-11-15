import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, resolveHospitalId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hospitalId = resolveHospitalId(ctx, request.nextUrl.searchParams.get("hospitalId"));
  if (!hospitalId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const insurers = await db.insurer.findMany({
    where: { hospitalId, isActive: true, kind: "INSURER" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, code: true, logoUrl: true },
  });

  return NextResponse.json({ insurers });
}
