"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Building2, ChevronRight, Copy, Check, User as UserIcon, KeyRound } from "lucide-react";
import HospitalOverview from "@/components/HospitalOverview";
import { toast } from "sonner";

type User = { username: string; name: string; role: string };
type Insurer = { id: string; name: string; code: string; portalUsername?: string | null; portalPassword?: string | null };
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

function CredentialChip({
  label,
  value,
  icon: Icon,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors group"
    >
      <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
      <span className="text-slate-500">{label}:</span>
      <span className="font-mono text-slate-800 max-w-[120px] truncate">{value}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 group-hover:text-blue-500" />
      )}
    </button>
  );
}

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
  const [portalUsername, setPortalUsername] = useState<string | null>(null);
  const [portalPassword, setPortalPassword] = useState<string | null>(null);
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
    setPortalUsername(null);
    setPortalPassword(null);
    setClaimsStats(null);
    try {
      const res = await fetch(`/api/dashboard?insurerId=${insurerId}`);
      if (res.ok) {
        const data = await res.json();
        const ins = data.insurer;
        setPortalUrl(ins.portalUrl || null);
        setPortalUsername(ins.portalUsername || null);
        setPortalPassword(ins.portalPassword || null);
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
    if (ins?.portalUsername) {
      navigator.clipboard.writeText(ins.portalUsername).then(() => {
        toast.success(`User ID copied: ${ins.portalUsername}`);
      });
    }
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
              /* Insurer header with breadcrumb + credential chips */
              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
                <div className="flex items-center flex-wrap gap-3">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                    <span>Dashboard</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-slate-800 font-semibold">{selectedInsurer.name}</span>
                  </div>

                  {/* Divider */}
                  <div className="h-5 w-px bg-slate-200 flex-shrink-0" />

                  {/* Credential chips — available instantly from dropdown selection */}
                  {selectedInsurer.portalUsername && (
                    <CredentialChip
                      label="User ID"
                      value={selectedInsurer.portalUsername}
                      icon={UserIcon}
                      onCopy={() => toast.success("User ID copied")}
                    />
                  )}
                  {selectedInsurer.portalPassword && (
                    <CredentialChip
                      label="Password"
                      value={selectedInsurer.portalPassword}
                      icon={KeyRound}
                      onCopy={() => toast.success("Password copied")}
                    />
                  )}

                  {/* Change button pushed to right */}
                  <button
                    onClick={() => { setSelectedInsurerId(""); setSelectedInsurer(null); }}
                    className="ml-auto text-xs text-blue-600 hover:underline flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Resource area */}
            {!selectedInsurerId ? (
              <HospitalOverview stats={aggregateStats} />
            ) : (
              <ResourceCards
                portalUrl={portalUrl}
                portalUsername={portalUsername}
                portalPassword={portalPassword}
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
