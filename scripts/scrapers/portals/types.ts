import type { Page } from "playwright";

export interface Credentials {
  username: string;
  password: string;
}

/** Figures a portal can report; leave out anything the portal doesn't show. */
export interface ScrapedStats {
  pending?: number;
  approved?: number;
  queries?: number;
  rejected?: number;
  dischargePending?: number;
  enhancementPending?: number;
}

export interface PortalScraper {
  /** Must match a key in src/lib/portals.ts */
  key: string;
  /** Fallback credentials come from <envPrefix>_PORTAL_USERNAME / _PASSWORD in .env.local */
  envPrefix: string;
  loginUrl: string;
  /** Logs in; throws if the login did not succeed */
  login(page: Page, creds: Credentials): Promise<void>;
  /**
   * Reads the figures for one insurer + TPA combination after login. It is called once per
   * combination on the same logged-in page, so it must leave the portal back on its dashboard.
   * Undefined until we know the portal's page layout.
   */
  readStats?(page: Page, combo: ComboContext): Promise<ReadResult>;
}

/** Which insurer + TPA the figures are being read for. */
export interface ComboContext {
  insurerName: string;
  /** The TPA's name, or the insurer's own name for its direct ("Self") channel */
  channelName: string;
  isSelf: boolean;
}

export interface ReadResult {
  stats: ScrapedStats;
  /**
   * PAYER: the numbers cover only this insurer's claims (the reader filtered by payer).
   * PORTAL: they cover the whole portal login, because the portal can't be split by insurer.
   */
  scope: "PAYER" | "PORTAL";
}

/** The portal asked for an OTP or captcha. We never try to get past these. */
export class BlockedError extends Error {}
