/**
 * Portals whose login form is known but whose dashboard layout isn't yet.
 * They log in and verify the login; `readStats` is added once we've seen the
 * dashboard (run the scraper with --inspect to save a screenshot of it).
 */
import type { PortalScraper } from "./types";
import { assertLoggedIn, declineCookies, genericLogin } from "./helpers";

export const healthIndia: PortalScraper = {
  key: "HEALTH_INDIA",
  envPrefix: "HEALTH_INDIA",
  loginUrl: "https://www.healthindiatpa.com/Logins/LoginProvider.aspx",
  async login(page, { username, password }) {
    await page.goto(this.loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await declineCookies(page);
    await page.fill("#ctl00_TopMenu_txtUserName", username);
    await page.fill("#ctl00_TopMenu_txtPassword", password);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => undefined),
      page.click("#ctl00_TopMenu_btnLogin"),
    ]);
    await assertLoggedIn(page);
  },
};

export const fhpl: PortalScraper = {
  key: "FHPL",
  envPrefix: "FHPL",
  loginUrl: "https://epreauth.fhpl.net/Login.aspx",
  async login(page, { username, password }) {
    await page.goto(this.loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.fill("#txtUserName", username);
    await page.fill("#txtPassword", password);
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => undefined),
      page.click("#btnLogIn"),
    ]);
    await assertLoggedIn(page);
  },
};

export const volo: PortalScraper = {
  key: "VOLO_HEALTH",
  envPrefix: "VOLO_HEALTH",
  loginUrl: "https://provider.volohealthtpa.com/home",
  async login(page, { username, password }) {
    await page.goto(this.loginUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await declineCookies(page);
    await genericLogin(page, username, password);
    await assertLoggedIn(page);
  },
};
