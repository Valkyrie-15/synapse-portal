import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext, resolveHospitalId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hospitalId = resolveHospitalId(ctx, request.nextUrl.searchParams.get("hospitalId"));
  if (!hospitalId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agg = await db.claimsStats.aggregate({
    where: { insurer: { hospitalId, isActive: true } },
    _sum: {
      pending: true,
      approved: true,
      queries: true,
      rejected: true,
      todaysClaims: true,
      monthlyClaims: true,
      alReceived: true,
      enhancementPending: true,
      dischargePending: true,
      paymentReceived: true,
      totalAmountApproved: true,
      totalAmountReceived: true,
      totalAmountDeducted: true,
      totalCasesProcessed: true,
      totalApprovedCases: true,
      totalDeniedCases: true,
    },
  });

  const s = agg._sum;
  return NextResponse.json({
    pending:             s.pending             ?? 0,
    approved:            s.approved            ?? 0,
    queries:             s.queries             ?? 0,
    rejected:            s.rejected            ?? 0,
    todaysClaims:        s.todaysClaims        ?? 0,
    monthlyClaims:       s.monthlyClaims       ?? 0,
    alReceived:          s.alReceived          ?? 0,
    enhancementPending:  s.enhancementPending  ?? 0,
    dischargePending:    s.dischargePending    ?? 0,
    paymentReceived:     s.paymentReceived     ?? 0,
    totalAmountApproved: s.totalAmountApproved ?? 0,
    totalAmountReceived: s.totalAmountReceived ?? 0,
    totalAmountDeducted: s.totalAmountDeducted ?? 0,
    totalCasesProcessed: s.totalCasesProcessed ?? 0,
    totalApprovedCases:  s.totalApprovedCases  ?? 0,
    totalDeniedCases:    s.totalDeniedCases    ?? 0,
  });
}
