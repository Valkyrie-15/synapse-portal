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
  /** Reads the dashboard figures after login. Undefined until we know the portal's page layout. */
  readStats?(page: Page): Promise<ScrapedStats>;
}

/** The portal asked for an OTP or captcha. We never try to get past these. */
export class BlockedError extends Error {}
