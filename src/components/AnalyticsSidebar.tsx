"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  MessageSquare,
  XCircle,
  TrendingUp,
  Calendar,
  DollarSign,
} from "lucide-react";

type ClaimsStats = {
  pending: number;
  approved: number;
  queries: number;
  rejected: number;
  todaysClaims: number;
  monthlyClaims: number;
};

type Commercial = {
  id: string;
  category: string;
  description: string;
  discountPercent?: number | null;
  packageRate?: number | null;
};

interface AnalyticsSidebarProps {
  stats: ClaimsStats | null;
  commercials: Commercial[];
  insurerName: string;
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

const monthlyTrend = [
  { month: "Jan", claims: 142 },
  { month: "Feb", claims: 168 },
  { month: "Mar", claims: 195 },
  { month: "Apr", claims: 178 },
  { month: "May", claims: 210 },
  { month: "Jun", claims: 234 },
  { month: "Jul", claims: 198 },
];

export default function AnalyticsSidebar({ stats, commercials, insurerName }: AnalyticsSidebarProps) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        Loading analytics...
      </div>
    );
  }

  const total = stats.pending + stats.approved + stats.queries + stats.rejected;

  const pieData = [
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Approved", value: stats.approved, color: "#10b981" },
    { name: "Queries", value: stats.queries, color: "#3b82f6" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const statCards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      badge: "warning" as const,
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      badge: "success" as const,
    },
    {
      label: "Queries",
      value: stats.queries,
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      badge: "default" as const,
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      badge: "destructive" as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Analytics</h2>
        <p className="text-xs text-slate-500">
          {insurerName === "Hospital Overview" ? "All Insurers — Aggregated" : `${insurerName} — Live Stats`}
        </p>
      </div>

      {/* Claim stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {statCards.map(({ label, value, icon: Icon, color, bg, badge }) => (
          <Card key={label} className="border">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <Badge variant={badge} className="text-xs px-1.5 py-0">{label}</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Today + Monthly */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border">
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-slate-500 font-medium">Today</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.todaysClaims}</p>
          </div>
        </Card>
        <Card className="border">
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs text-slate-500 font-medium">Monthly</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.monthlyClaims}</p>
          </div>
        </Card>
      </div>

      {/* Pie chart */}
      <Card className="border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">Claims Distribution</CardTitle>
          <p className="text-xs text-slate-500">Total: {total.toLocaleString()} claims</p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2 px-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly trend bar chart */}
      <Card className="border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">6-Month Trend</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={monthlyTrend} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v) => [Number(v), "Claims"]}
              />
              <Bar dataKey="claims" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Commercials */}
      {commercials.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm">Commercial Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {commercials.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{c.category}</p>
                  <p className="text-xs text-slate-500 truncate">{c.description}</p>
                </div>
                {c.discountPercent != null && (
                  <Badge variant="success" className="text-xs flex-shrink-0">
                    {c.discountPercent}% off
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
