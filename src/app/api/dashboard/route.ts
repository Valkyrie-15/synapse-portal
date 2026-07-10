import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");

  if (!insurerId) {
    return NextResponse.json({ error: "insurerId required" }, { status: 400 });
  }

  const insurer = await db.insurer.findUnique({
    where: { id: insurerId },
    include: {
      documents: { where: { isActive: true } },
      contacts: true,
      commercials: true,
      claimsStats: true,
    },
  });

  if (!insurer) {
    return NextResponse.json({ error: "Insurer not found" }, { status: 404 });
  }

  return NextResponse.json({ insurer });
}
