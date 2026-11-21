// Provider portals the scrapers know about. An insurer/TPA row is linked to a portal by the
// hostname of its portalUrl. Several combinations can use the same portal (e.g. every payer on
// IHX), but figures are stored per insurer + TPA combination, never per portal.

export interface PortalInfo {
  key: string;
  label: string;
  host: string;
}

export const PORTALS: PortalInfo[] = [
  { key: "IHX",          label: "IHX",                 host: "provider.ihx.in" },
  { key: "HEALTH_INDIA", label: "Health India TPA",    host: "www.healthindiatpa.com" },
  { key: "VOLO_HEALTH",  label: "East West Assist (Volo)", host: "provider.volohealthtpa.com" },
  { key: "FHPL",         label: "FHPL",                host: "epreauth.fhpl.net" },
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
