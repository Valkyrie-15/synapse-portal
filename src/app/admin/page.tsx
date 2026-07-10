import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Phone, DollarSign, Users } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [insurerCount, documentCount, contactCount, commercialCount, userCount] = await Promise.all([
    db.insurer.count(),
    db.document.count(),
    db.contact.count(),
    db.commercial.count(),
    db.user.count(),
  ]);

  const recentInsurers = await db.insurer.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true, isActive: true, portalUrl: true },
  });

  const stats = [
    { label: "Insurers", value: insurerCount, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/insurers" },
    { label: "Documents", value: documentCount, icon: FileText, color: "text-violet-600", bg: "bg-violet-50", href: "/admin/documents" },
    { label: "Contacts", value: contactCount, icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50", href: "/admin/contacts" },
    { label: "Commercials", value: commercialCount, icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", href: "/admin/commercials" },
    { label: "Users", value: userCount, icon: Users, color: "text-slate-600", bg: "bg-slate-100", href: "#" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your Synapse portal data</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent insurers */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Recent Insurers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentInsurers.map((ins) => (
              <div key={ins.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-sm text-slate-800">{ins.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{ins.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {ins.portalUrl ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Portal Set</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No Portal</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ins.isActive ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                    {ins.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
