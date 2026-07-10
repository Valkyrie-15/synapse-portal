"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ResourceCards from "@/components/ResourceCards";
import AnalyticsSidebar from "@/components/AnalyticsSidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronRight } from "lucide-react";
import HospitalOverview from "@/components/HospitalOverview";

type User = { username: string; name: string; role: string };
type Insurer = { id: string; name: string; code: string };
type ClaimsStats = {
  pending: number;
  approved: number;
  queries: number;
  rejected: number;
  todaysClaims: number;
  monthlyClaims: number;
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
type Document = { id: string; type: string; title: string; url: string; isActive: boolean };
type Contact = { id: string; name: string; role: string; email?: string | null; phone?: string | null; mobile?: string | null };
type Commercial = { id: string; category: string; description: string; discountPercent?: number | null; packageRate?: number | null };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [selectedInsurerId, setSelectedInsurerId] = useState<string>("");
  const [selectedInsurer, setSelectedInsurer] = useState<Insurer | null>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [claimsStats, setClaimsStats] = useState<ClaimsStats | null>(null);
  const [aggregateStats, setAggregateStats] = useState<ClaimsStats | null>(null);

  useEffect(() => {
    async function init() {
      const [meRes, insurersRes, summaryRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/insurers"),
        fetch("/api/dashboard/summary"),
      ]);
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      if (insurersRes.ok) {
        const data = await insurersRes.json();
        setInsurers(data.insurers || []);
      }

      if (summaryRes.ok) {
        setAggregateStats(await summaryRes.json());
      }
    }
    init();
  }, [router]);

  const loadInsurerData = useCallback(async (insurerId: string) => {
    setLoading(true);
    setDocuments([]);
    setContacts([]);
    setCommercials([]);
    setPortalUrl(null);
    setClaimsStats(null);
    try {
      const res = await fetch(`/api/dashboard?insurerId=${insurerId}`);
      if (res.ok) {
        const data = await res.json();
        const ins = data.insurer;
        setPortalUrl(ins.portalUrl || null);
        setDocuments(ins.documents || []);
        setContacts(ins.contacts || []);
        setCommercials(ins.commercials || []);
        setClaimsStats(ins.claimsStats || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInsurerChange(value: string) {
    setSelectedInsurerId(value);
    const ins = insurers.find((i) => i.id === value) || null;
    setSelectedInsurer(ins);
    if (value) loadInsurerData(value);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Breadcrumb / insurer header */}
            {!selectedInsurer ? (
              /* Selector — only shown before an insurer is chosen */
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      Select Insurance / TPA
                    </label>
                  </div>
                  <div className="flex-1 min-w-[260px] max-w-sm">
                    <Select value={selectedInsurerId} onValueChange={handleInsurerChange}>
                      <SelectTrigger className="bg-white text-slate-800 font-medium border-slate-300 h-11">
                        <SelectValue placeholder="Choose an insurer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {insurers.map((ins) => (
                          <SelectItem key={ins.id} value={ins.id}>
                            {ins.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              /* Insurer header with breadcrumb + change button */
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="w-4 h-4" />
                  <span>Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-slate-800 font-semibold">{selectedInsurer.name}</span>
                </div>
                <button
                  onClick={() => { setSelectedInsurerId(""); setSelectedInsurer(null); }}
                  className="ml-2 text-xs text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>
            )}

            {/* Resource area */}
            {!selectedInsurerId ? (
              <HospitalOverview stats={aggregateStats} />
            ) : (
              <ResourceCards
                portalUrl={portalUrl}
                documents={documents}
                contacts={contacts}
                loading={loading}
                insurerName={selectedInsurer?.name || ""}
              />
            )}
          </div>
        </main>

        {/* Right sidebar — only when an insurer is selected */}
        {selectedInsurerId && (
          <aside className="w-80 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            <div className="p-4">
              <AnalyticsSidebar
                stats={claimsStats}
                commercials={commercials}
                insurerName={selectedInsurer?.name || ""}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
