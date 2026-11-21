// Provider portals the scrapers know about. An insurer/TPA row is linked to a portal by the
// hostname of its portalUrl, so several rows (e.g. every payer on IHX) share one portal's stats.

export interface PortalInfo {
  key: string;
  label: string;
  host: string;
  /** What the scraped numbers cover, shown next to them on the dashboard */
  scope: string;
}

export const PORTALS: PortalInfo[] = [
  { key: "IHX",          label: "IHX",                 host: "provider.ihx.in",            scope: "All payers on this hospital's IHX login" },
  { key: "HEALTH_INDIA", label: "Health India TPA",    host: "www.healthindiatpa.com",     scope: "This hospital's Health India login" },
  { key: "VOLO_HEALTH",  label: "East West Assist (Volo)", host: "provider.volohealthtpa.com", scope: "This hospital's East West Assist login" },
  { key: "FHPL",         label: "FHPL",                host: "epreauth.fhpl.net",          scope: "This hospital's FHPL login" },
];

export function portalForUrl(url: string | null | undefined): PortalInfo | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PORTALS.find((p) => p.host === host) ?? null;
  } catch {
    return null;
  }
}
