"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock, CheckCircle2, Loader2, MessageSquare, RefreshCw, XCircle, LogOut, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LivePortal = {
  key: string;
  label: string;
  stats: {
    scope: string;
    pending: number | null;
    approved: number | null;
    queries: number | null;
    rejected: number | null;
    dischargePending: number | null;
    enhancementPending: number | null;
    status: string;
    message: string | null;
    scrapedAt: string | null;
    checkedAt: string;
    requestedAt: string | null;
  } | null;
};

type Stats = NonNullable<LivePortal["stats"]>;

const POLL_EVERY_MS = 5000;

const FIELDS = [
  { key: "pending", label: "Approval Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "queries", label: "Queries Pending", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "dischargePending", label: "Awaiting Discharge", icon: LogOut, color: "text-violet-600", bg: "bg-violet-50" },
  { key: "enhancementPending", label: "Enhancement Pending", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
] as const;

// Figures refresh daily, so only call them stale once a whole run has clearly been missed
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

function timeAgo(iso: string, now: number): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export default function LivePortalStats({
  portal,
  insurerId,
  tpaId,
  insurerName,
  channelName,
  onUpdated,
}: {
  portal: LivePortal;
  /** The insurance company */
  insurerId: string;
  /** The TPA, or the insurer's own id for its direct ("Self") channel */
  tpaId: string;
  insurerName: string;
  channelName: string;
  /** Called once an update finishes, so the page can reload the new figures */
  onUpdated: () => void;
}) {
  // "now" is refreshed whenever we hear from the server, so ages stay roughly right
  const [now, setNow] = useState(() => Date.now());
  const [running, setRunning] = useState(portal.stats?.status === "RUNNING");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While an update is running, ask the server every few seconds whether it has finished
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/scrape?insurerId=${encodeURIComponent(insurerId)}&tpaId=${encodeURIComponent(tpaId)}`);
        if (!res.ok) return;
        const latest: Stats | null = (await res.json()).stats;
        setNow(Date.now());
        if (latest && latest.status !== "RUNNING") {
          setRunning(false);
          onUpdated();
        }
      } catch {
        // network blip; try again on the next tick
      }
    }, POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [running, insurerId, tpaId, onUpdated]);

  async function getData() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insurerId, tpaId }),
      });
      const data = await res.json().catch(() => ({}));
      setNow(Date.now());
      if (res.ok) setRunning(true);
      else setError(data.error || "Could not start the update.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  const s = portal.stats;
  const tiles = s ? FIELDS.filter((f) => s[f.key] !== null) : [];
  const failed = !running && s && (s.status === "ERROR" || s.status === "BLOCKED");
  const stale = s?.scrapedAt && now - new Date(s.scrapedAt).getTime() > STALE_AFTER_MS;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Live Portal Figures · {portal.label}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {insurerName} · via {channelName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {s?.scrapedAt && (
            <span className="text-xs text-slate-500" title={new Date(s.scrapedAt).toLocaleString()}>
              Updated {timeAgo(s.scrapedAt, now)}
              {stale && <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-200">Stale</Badge>}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={getData} disabled={running || starting}>
            {running || starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {running ? "Getting data…" : "Get data"}
          </Button>
        </div>
      </div>

      {running && (
        <p className="mb-3 text-xs text-slate-500">
          Logging in to {portal.label} and reading the latest figures. This usually takes 1–3 minutes; you can keep working.
        </p>
      )}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {tiles.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tiles.map(({ key, label, icon: Icon, color, bg }) => (
              <Card key={key} className="border">
                <div className="p-4 flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-slate-800 leading-none">{s![key]!.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {s!.scope === "PAYER"
              ? `Figures for ${insurerName} only.`
              : `Saved for this insurer and TPA. ${portal.label} reports one total for the whole login, so other combinations on ${portal.label} can show the same numbers.`}
          </p>
        </>
      ) : (
        <Card className="border border-dashed">
          <div className="p-4 text-sm text-slate-500">
            {!s
              ? `No figures yet. Press "Get data" to read them from ${portal.label}.`
              : s.status === "NO_PARSER"
                ? `Logged in to ${portal.label}, but reading its figures isn't supported yet.`
                : s.status === "OK" || s.status === "RUNNING"
                  ? `No figures yet. Press "Get data" to read them from ${portal.label}.`
                  : "No figures could be read from the portal yet."}
          </div>
        </Card>
      )}

      {failed && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span title={s!.message ?? undefined}>
            {s!.status === "BLOCKED"
              ? "The portal now asks for an OTP or captcha, so figures can't be updated automatically."
              : "The last update from the portal failed."}{" "}
            Tried {timeAgo(s!.checkedAt, now)}.{tiles.length > 0 && " Showing the last figures that were read successfully."}
          </span>
        </div>
      )}
    </div>
  );
}
