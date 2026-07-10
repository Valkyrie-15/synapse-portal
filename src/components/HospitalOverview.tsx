"use client";

import { Card } from "@/components/ui/card";
import {
  Clock, CheckCircle2, MessageSquare, XCircle,
  FileCheck, LogOut, BadgeCheck, CreditCard,
  TrendingUp, Wallet, ArrowDownCircle,
  LayoutList, ThumbsUp, ThumbsDown,
} from "lucide-react";

type ClaimsStats = {
  pending: number;
  approved: number;
  queries: number;
  rejected: number;
  alReceived: number;
  enhancementPending: number;
  dischargePending: number;
  paymentReceived: number;
  totalAmountApproved: number;
  totalAmountReceived: number;
  totalAmountDeducted: number;
  totalCasesProcessed: number;
  totalApprovedCases: number;
  totalDeniedCases: number;
};

function formatAmount(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function StatCard({
  label, value, icon: Icon, iconColor, iconBg,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="p-4">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <p className="text-2xl font-bold text-slate-800">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </Card>
  );
}

export default function HospitalOverview({ stats }: { stats: ClaimsStats | null }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1 — Claim status */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Claim Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Preauth Pending"      value={stats.pending}           icon={Clock}        iconColor="text-amber-600"   iconBg="bg-amber-50" />
          <StatCard label="Query Pending"         value={stats.queries}           icon={MessageSquare} iconColor="text-blue-600"    iconBg="bg-blue-50" />
          <StatCard label="Denial / Rejection"    value={stats.rejected}          icon={XCircle}      iconColor="text-red-600"     iconBg="bg-red-50" />
          <StatCard label="AL Received"           value={stats.alReceived}        icon={FileCheck}    iconColor="text-violet-600"  iconBg="bg-violet-50" />
          <StatCard label="Enhancement Pending"   value={stats.enhancementPending} icon={TrendingUp}  iconColor="text-orange-600"  iconBg="bg-orange-50" />
          <StatCard label="Discharge Pending"     value={stats.dischargePending}  icon={LogOut}       iconColor="text-cyan-600"    iconBg="bg-cyan-50" />
          <StatCard label="Approval Received"     value={stats.approved}          icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard label="Payment Received"      value={stats.paymentReceived}   icon={CreditCard}   iconColor="text-teal-600"    iconBg="bg-teal-50" />
        </div>
      </div>

      {/* Section 2 — Financials */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Financials</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Amount Approved" value={formatAmount(stats.totalAmountApproved)} icon={BadgeCheck}      iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard label="Total Amount Received" value={formatAmount(stats.totalAmountReceived)} icon={Wallet}          iconColor="text-blue-600"    iconBg="bg-blue-50" />
          <StatCard label="Total Amount Deducted" value={formatAmount(stats.totalAmountDeducted)} icon={ArrowDownCircle} iconColor="text-red-600"     iconBg="bg-red-50" />
        </div>
      </div>

      {/* Section 3 — Case counts */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Case Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total Cases Processed"         value={stats.totalCasesProcessed} icon={LayoutList}  iconColor="text-slate-600"   iconBg="bg-slate-100" />
          <StatCard label="Total Approved Cases"          value={stats.totalApprovedCases}  icon={ThumbsUp}    iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard label="Total Denial / Rejected Cases" value={stats.totalDeniedCases}    icon={ThumbsDown}  iconColor="text-red-600"     iconBg="bg-red-50" />
        </div>
      </div>
    </div>
  );
}
