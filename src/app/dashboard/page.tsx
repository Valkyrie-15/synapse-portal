"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ResourceCards, { ContactDetails } from "@/components/ResourceCards";
import AnalyticsSidebar from "@/components/AnalyticsSidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronRight, Loader2, Network } from "lucide-react";
import HospitalOverview from "@/components/HospitalOverview";

type User = { username: string; name: string; role: string };
type Hospital = { id: string; name: string; code: string; city: string | null; logoUrl: string | null };
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
type InsurerDetail = {
  id: string;
  name: string;
  code: string;
  portalUrl: string | null;
  driveUrl: string | null;
  selfChannel: boolean;
  tpas: Insurer[];
  documents: Document[];
  contacts: Contact[];
  commercials: Commercial[];
  claimsStats: ClaimsStats | null;
};

async function fetchDetail(id: string): Promise<InsurerDetail | null> {
  const res = await fetch(`/api/dashboard?insurerId=${id}`);
  if (!res.ok) return null;
  return (await res.json()).insurer;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Dashboard />
    </Suspense>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Step 1: no insurer; step 2: insurer selected; step 3: insurer + TPA selected
  const insurerId = searchParams.get("insurer") ?? "";
  const tpaParam = searchParams.get("tpa") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [aggregateStats, setAggregateStats] = useState<ClaimsStats | null>(null);
  // `*For` records which id the current detail was fetched for, so stale or pending data is never shown
  const [insurer, setInsurer] = useState<InsurerDetail | null>(null);
  const [insurerFor, setInsurerFor] = useState("");
  const [tpa, setTpa] = useState<InsurerDetail | null>(null);
  const [tpaFor, setTpaFor] = useState("");

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
      setHospital(meData.hospital);

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

  // Load the selected insurer (stats, company details, mapped TPAs)
  useEffect(() => {
    if (!insurerId) return;
    let cancelled = false;
    fetchDetail(insurerId).then((data) => {
      if (cancelled) return;
      setInsurer(data);
      setInsurerFor(insurerId);
    });
    return () => { cancelled = true; };
  }, [insurerId]);
  const insurerLoading = !!insurerId && insurerFor !== insurerId;

  // TPA options: mapped TPAs, plus the insurer itself when it processes claims directly
  const tpaOptions: Insurer[] = insurer && !insurerLoading
    ? [
        ...(insurer.selfChannel ? [{ id: insurer.id, name: `Self (Direct with ${insurer.name})`, code: insurer.code }] : []),
        ...insurer.tpas,
      ]
    : [];
  // Only honour a TPA that is mapped to the selected insurer
  const tpaId = tpaOptions.some((o) => o.id === tpaParam) ? tpaParam : "";
  const selectedTpaName = tpaOptions.find((o) => o.id === tpaId)?.name ?? "";

  // Load the selected TPA's portal details (the "Self" option reuses the insurer's own record)
  useEffect(() => {
    if (!tpaId || !insurer || tpaId === insurer.id) return;
    let cancelled = false;
    fetchDetail(tpaId).then((data) => {
      if (cancelled) return;
      setTpa(data);
      setTpaFor(tpaId);
    });
    return () => { cancelled = true; };
  }, [tpaId, insurer]);
  const isSelf = !!insurer && tpaId === insurer.id;
  const tpaDetail = isSelf ? insurer : tpaFor === tpaId ? tpa : null;
  const tpaLoading = !!tpaId && !isSelf && tpaFor !== tpaId;

  function goTo(nextInsurerId?: string, nextTpaId?: string) {
    const params = new URLSearchParams();
    if (nextInsurerId) params.set("insurer", nextInsurerId);
    if (nextInsurerId && nextTpaId) params.set("tpa", nextTpaId);
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  }

  if (!user) return <FullPageSpinner />;

  const insurerName = (!insurerLoading && insurer?.name) || insurers.find((i) => i.id === insurerId)?.name || "";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            {/* Hospital identity banner */}
            {hospital && (
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0 p-1">
                  {hospital.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hospital.logoUrl} alt={hospital.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-7 h-7 text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-slate-800 font-bold text-base leading-tight">{hospital.name}</h2>
                  {hospital.city && <p className="text-slate-500 text-sm leading-tight">{hospital.city}</p>}
                </div>
              </div>
            )}

            {!insurerId ? (
              /* Step 1 — select insurer */
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <label className="font-semibold text-slate-700 whitespace-nowrap">
                        Select Insurance Company
                      </label>
                    </div>
                    <div className="flex-1 min-w-[260px] max-w-sm">
                      <Select value="" onValueChange={(value) => goTo(value)}>
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
                <HospitalOverview stats={aggregateStats} />
              </>
            ) : (
              <>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6 flex-wrap">
                  <button
                    onClick={() => goTo()}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {tpaId ? (
                    <button
                      onClick={() => goTo(insurerId)}
                      className="text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {insurerName}
                    </button>
                  ) : (
                    <span className="text-slate-800 font-semibold">{insurerName}</span>
                  )}
                  {tpaId && (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-800 font-semibold">{selectedTpaName}</span>
                    </>
                  )}
                </div>

                {insurerLoading || !insurer ? (
                  <div className="flex items-center justify-center py-20">
                    {insurerLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    ) : (
                      <p className="text-sm text-slate-500">Insurer not found.</p>
                    )}
                  </div>
                ) : !tpaId ? (
                  /* Step 2 — select TPA, with insurer company details */
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Network className="w-5 h-5 text-blue-600" />
                          <label className="font-semibold text-slate-700 whitespace-nowrap">
                            Select TPA
                          </label>
                        </div>
                        <div className="flex-1 min-w-[260px] max-w-sm">
                          {tpaOptions.length > 0 ? (
                            <Select value="" onValueChange={(value) => goTo(insurerId, value)}>
                              <SelectTrigger className="bg-white text-slate-800 font-medium border-slate-300 h-11">
                                <SelectValue placeholder="Choose a TPA..." />
                              </SelectTrigger>
                              <SelectContent>
                                {tpaOptions.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    {opt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-slate-500">No TPAs are mapped to this insurer yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Company Details
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 flex-shrink-0 shadow">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800">{insurer.name}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {tpaOptions.length} claim {tpaOptions.length === 1 ? "channel" : "channels"}
                            {insurer.selfChannel ? " · processes claims directly" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <ContactDetails contacts={insurer.contacts} />
                  </div>
                ) : tpaLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : !tpaDetail ? (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-sm text-slate-500">TPA not found.</p>
                  </div>
                ) : (
                  /* Step 3 — TPA portal details */
                  <ResourceCards
                    portalUrl={tpaDetail.portalUrl}
                    driveUrl={tpaDetail.driveUrl}
                    documents={tpaDetail.documents}
                    contacts={tpaDetail.contacts}
                    loading={false}
                    insurerName={tpaDetail.name}
                  />
                )}
              </>
            )}
          </div>
        </main>

        {insurerId && (
          <aside className="w-80 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
            <div className="p-4">
              <AnalyticsSidebar
                stats={insurerLoading ? null : insurer?.claimsStats ?? null}
                commercials={insurerLoading ? [] : insurer?.commercials ?? []}
                insurerName={insurerName}
                loading={insurerLoading}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
