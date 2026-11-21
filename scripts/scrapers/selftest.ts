// Self-test: runs the scraper modules against fake portal pages served from localhost (no real portal is contacted).
import http from "http";
import { chromium } from "playwright";
import { ihx } from "./portals/ihx";
import { volo } from "./portals/others";
import { BlockedError, type PortalScraper } from "./portals/types";

const LOGIN = (extra = "") => `<html><body>
  <form method="GET" action="/claims/dashboard">
    <input id="login-form_username" name="u" type="text"><input id="login-form_password" name="p" type="password">
    ${extra}<button type="submit">Login</button>
  </form></body></html>`;
const DASH = `<html><body>
  <div class="tags-content"><div class="tags-title-claim-view">Queries Pending</div><div class="tags-count-claimView">7</div></div>
  <div class="tags-content"><div class="tags-title-claim-view">Approval Pending</div><div class="tags-count-claimView">12</div></div>
  <div class="tags-content"><div class="tags-title-claim-view">Awaiting Discharge</div><span class="tags-day-wise-count">3</span><span class="tags-day-wise-count">2</span></div>
  <div class="tags-content"><div class="tags-title-claim-view">Drafts Pending</div><div class="tags-count-claimView">9</div></div>
</body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url!, "http://x");
  res.setHeader("Content-Type", "text/html");
  if (url.pathname.startsWith("/claims/")) {
    if (url.searchParams.get("p") !== "right") return res.end(LOGIN()); // wrong password: back to login
    return res.end(DASH);
  }
  if (url.pathname === "/otp") return res.end(LOGIN('<input id="otp" placeholder="Enter OTP">'));
  return res.end(LOGIN());
});

async function attempt(label: string, scraper: PortalScraper, password: string, expect: (r: unknown, e: unknown) => boolean) {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const page = await browser.newPage();
  let result: unknown, error: unknown;
  try {
    await scraper.login(page, { username: "test", password });
    result = scraper.readStats ? await scraper.readStats(page) : "logged in";
  } catch (e) {
    error = e;
  }
  await browser.close();
  const ok = expect(result, error);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${error ? `error -> ${(error as Error).constructor.name}: ${(error as Error).message}` : JSON.stringify(result)}`);
  return ok;
}

server.listen(0, async () => {
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const fakeIhx = { ...ihx, loginUrl: `${base}/` };
  const fakeVolo = { ...volo, loginUrl: `${base}/` };
  const fakeOtp = { ...volo, loginUrl: `${base}/otp` };
  const results = [
    await attempt("IHX login + tiles", fakeIhx, "right", (r) => JSON.stringify(r) === JSON.stringify({ queries: 7, pending: 12, dischargePending: 5 })),
    await attempt("IHX wrong password", fakeIhx, "wrong", (_r, e) => e instanceof Error && /Login failed/.test(e.message)),
    await attempt("generic login (Volo-style)", fakeVolo, "right", (r) => r === "logged in"),
    await attempt("OTP page is detected, not bypassed", fakeOtp, "right", (_r, e) => e instanceof BlockedError),
  ];
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  server.close();
  process.exit(results.every(Boolean) ? 0 : 1);
});
