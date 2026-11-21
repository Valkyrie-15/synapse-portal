import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────
// Every insurer/TPA row, document, contact, commercial and claims stat belongs to one hospital.
// An insurer's own portal fields describe its "Self" channel (selfChannel: true); claims via a
// TPA use the TPA's portal. portalUrl null => communicates via email (see contacts).
type Row = { name: string; code: string; kind: "INSURER" | "TPA"; portalUrl: string | null; portalUsername?: string | null; portalPassword?: string | null; selfChannel?: boolean; tpas?: string[]; sortOrder: number; isActive?: boolean };
type Doc = { code: string; type: string; title: string; url: string };
type ContactRow = { code: string; name: string; role: string; email: string | null; phone: string | null; mobile: string | null };
type CommercialRow = { code: string; category: string; description: string; discountPercent: number | null; packageRate: number | null; notes: string };
type Stats = { code: string; pending: number; approved: number; queries: number; rejected: number; todaysClaims: number; monthlyClaims: number; alReceived: number; enhancementPending: number; dischargePending: number; paymentReceived: number; totalAmountApproved: number; totalAmountReceived: number; totalAmountDeducted: number; totalCasesProcessed: number; totalApprovedCases: number; totalDeniedCases: number };
// Sample live-portal figures, one per insurer + TPA combination (demo hospitals only; real ones come from `npm run scrape`).
// `channel` is the TPA code, or the insurer's own code for its direct ("Self") channel.
type PortalRow = { insurer: string; channel: string; portal: string; pending?: number; approved?: number; queries?: number; rejected?: number; dischargePending?: number; enhancementPending?: number };
type HospitalSeed = { removedCodes?: string[]; insurers: Row[]; docs: Doc[]; contacts: ContactRow[]; commercials: CommercialRow[]; claims: Stats[]; portalStats?: PortalRow[] };

// Real documents live in storage/documents/<HOSPITAL>/<INSURER>/ and are served (login required) by /api/files/
const file = (hospital: string, code: string, name: string) => `/api/files/${hospital}/${code}/${name}`;

// ── Ajinkyatara Multi-speciality Hospital ─────────────────────────────────────
// Source: "Tie-Up Information New-Ajinkyatara.xlsx" (tie-ups marked Y).
const IHX_URL  = "https://provider.ihx.in/";
const IHX_USER = "insuajinkyatara@gmail.com";
const IHX_PASS = "ihx@123";
const ihx = { portalUrl: IHX_URL, portalUsername: IHX_USER, portalPassword: IHX_PASS };
const PSU_TPAS = ["MEDI_ASSIST", "HEALTH_INDIA", "MD_INDIA", "ERICSON", "HITPA", "PARAMOUNT"];

const AJINKYATARA: HospitalSeed = {
  removedCodes: [
    "VIDAL_HEALTH", "RAKSHA_TPA", "NIVA_BUPA", "NVGT_CARE", "HERITAGE_HEALTH", "ICICI_LOMBARD",
    // Folded into the insurer's "Self" channel
    "BAJAJ_ALLIANZ_SELF", "CARE_HEALTH_SELF",
    // Not in "Tie-Up Information New-Ajinkyatara.xlsx"
    "MAGMA",
    // Test entry, no longer needed
    "STAR_HEALTH",
  ],
  insurers: [
      { kind: "INSURER", name: "Vitraya Health",                                     code: "VITRAYA",            portalUrl: "https://vhi.vitraya.com/preAuth/claims", sortOrder: 0, isActive: false },
      // Insurance companies
      { kind: "INSURER", name: "National Insurance Company Ltd",                     code: "NATIONAL_INSURANCE", portalUrl: null, tpas: PSU_TPAS, sortOrder: 2 },
      { kind: "INSURER", name: "The New India Assurance Co. Ltd",                    code: "NEW_INDIA",          portalUrl: null, tpas: PSU_TPAS, sortOrder: 3 },
      { kind: "INSURER", name: "The Oriental Insurance Co. Ltd",                     code: "IHX",                portalUrl: null, tpas: PSU_TPAS, sortOrder: 4 },
      { kind: "INSURER", name: "United India Insurance Co. Ltd",                     code: "UNITED_INDIA",       portalUrl: null, tpas: PSU_TPAS, sortOrder: 5 },
      { kind: "INSURER", name: "ACKO General Insurance Limited",                     code: "ACKO",               portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 6 },
      { kind: "INSURER", name: "Aditya Birla Health Insurance Company Limited",      code: "ADITYA_BIRLA",       ...ihx, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 7 },
      { kind: "INSURER", name: "Bajaj Allianz General Insurance Company Limited",    code: "BAJAJ_ALLIANZ",      portalUrl: null, portalUsername: "ajinkya138236@hat.co.in", portalPassword: "ajinkya138236", selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 8 },
      { kind: "INSURER", name: "Care Health Insurance Company Limited",              code: "CARE_HEALTH",        portalUrl: null, portalUsername: "23850951", portalPassword: "Care@14112026", selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 9 },
      { kind: "INSURER", name: "Generali Central Insurance Company Limited",         code: "GENERALI_CENTRAL",   portalUrl: null, portalUsername: "H587746", portalPassword: "FGH@123", selfChannel: true, sortOrder: 10 },
      { kind: "INSURER", name: "Go Digit General Insurance Limited",                 code: "GO_DIGIT",           portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 11 },
      { kind: "INSURER", name: "HDFC Ergo General Insurance Company Limited",        code: "HDFC_ERGO",          ...ihx, selfChannel: true, sortOrder: 12 },
      { kind: "INSURER", name: "Liberty General Insurance Limited",                  code: "LIBERTY",            portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 13 },
      { kind: "INSURER", name: "Reliance General Insurance Company Limited",         code: "RELIANCE_GENERAL",   portalUrl: null, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 15 },
      { kind: "INSURER", name: "SBI General Insurance Company Limited",              code: "SBI_GENERAL",        portalUrl: null, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 16 },
      { kind: "INSURER", name: "Tata AIG General Insurance Company Limited",         code: "TATA_AIG",           portalUrl: null, selfChannel: true, sortOrder: 17 },
      // TPAs
      { kind: "TPA", name: "Medi Assist Insurance TPA Private Limited",              code: "MEDI_ASSIST",        ...ihx, sortOrder: 20 },
      { kind: "TPA", name: "MD India Health Insurance TPA Private Limited",          code: "MD_INDIA",           ...ihx, sortOrder: 21 },
      { kind: "TPA", name: "Family Health Plan Insurance TPA Private Limited",       code: "FHPL",               portalUrl: "https://epreauth.fhpl.net/SearchPreauths.aspx", sortOrder: 22 },
      { kind: "TPA", name: "Paramount Health Services & Insurance TPA Private Limited", code: "PARAMOUNT",          portalUrl: null, sortOrder: 23 },
      { kind: "TPA", name: "East West Assist Insurance TPA Private Limited",         code: "VOLO_HEALTH",        portalUrl: "https://provider.volohealthtpa.com/home", portalUsername: "PRV7811_2", portalPassword: "Volo10112026", sortOrder: 24 },
      { kind: "TPA", name: "Medsave Health Insurance TPA Limited",                   code: "MEDSAVE",            portalUrl: null, sortOrder: 25 },
      { kind: "TPA", name: "Health India Insurance TPA Services Private Limited",    code: "HEALTH_INDIA",       portalUrl: "https://www.healthindiatpa.com/Logins/LoginProvider.aspx", portalUsername: "74936", portalPassword: "74936", sortOrder: 26 },
      { kind: "TPA", name: "Ericson Insurance TPA Private Limited",                  code: "ERICSON",            portalUrl: null, sortOrder: 27 },
      { kind: "TPA", name: "Health Insurance TPA of India Limited",                  code: "HITPA",              portalUrl: null, sortOrder: 28 },
  ],
  docs: [
      { code: "ADITYA_BIRLA",     type: "SURGICAL_PACKAGES", title: "Aditya Birla Rate List (from 22.05.2025)",       url: file("AJINKYATARA", "ADITYA_BIRLA", "aditya-birla-rate-list-2025-05-22.pdf") },
      { code: "RELIANCE_GENERAL", type: "SURGICAL_PACKAGES", title: "Reliance General (RGICL) Package Rate List",     url: file("AJINKYATARA", "RELIANCE_GENERAL", "reliance-gic-package-rate-list.pdf") },
      { code: "IHX",              type: "SURGICAL_PACKAGES", title: "Oriental Insurance GIPSA PPN Rate List",         url: file("AJINKYATARA", "IHX", "oriental-gipsa-ppn-rate-list.pdf") },
      { code: "HDFC_ERGO",        type: "SURGICAL_PACKAGES", title: "HDFC Ergo Package Rate List",                    url: file("AJINKYATARA", "HDFC_ERGO", "hdfc-ergo-package-rate-list.pdf") },
      { code: "BAJAJ_ALLIANZ",    type: "SURGICAL_PACKAGES", title: "Bajaj Allianz Acceptance Letter & Rate List",    url: file("AJINKYATARA", "BAJAJ_ALLIANZ", "bajaj-allianz-acceptance-letter-rate-list.pdf") },
      { code: "MEDI_ASSIST",      type: "SURGICAL_PACKAGES", title: "Medi Assist Rate List & Discount Letter",        url: file("AJINKYATARA", "MEDI_ASSIST", "medi-assist-rate-list-discount-letter.pdf") },
      { code: "ERICSON",          type: "SURGICAL_PACKAGES", title: "Ericson Renewal Rate List (15.05.2025)",         url: file("AJINKYATARA", "ERICSON", "ericson-renewal-rate-list-2025-05-15.pdf") },
      { code: "CARE_HEALTH",      type: "SURGICAL_PACKAGES", title: "Care Health Agreed Packages",                    url: file("AJINKYATARA", "CARE_HEALTH", "care-health-agreed-packages.pdf") },
  ],
  contacts: [
      { code: "RELIANCE_GENERAL", name: "Healthcare Desk", role: "Cashless (Self) – Email", email: "healthcare@indusindinsurance.com", phone: null, mobile: null },
      { code: "SBI_GENERAL",      name: "Cashless Health", role: "Cashless (Self) – Email", email: "cashless.health@sbigeneral.in",   phone: null, mobile: null },
      { code: "TATA_AIG",         name: "Preauth Desk",    role: "Cashless – Email",        email: "preauth@tataaig.com",             phone: null, mobile: null },
      { code: "FHPL",             name: "Cashless Desk",   role: "Cashless – Email",        email: "Cashless@fhpl.net",               phone: null, mobile: null },
      { code: "MEDSAVE",          name: "Cashless Desk",   role: "Cashless – Email",        email: "cashless@medsave.in",             phone: null, mobile: null },
      { code: "ERICSON",          name: "Cashless Desk",   role: "Cashless – Email",        email: "cashless@ericsontpa.com",         phone: null, mobile: null },
      { code: "HITPA",            name: "Cashless Desk",   role: "Cashless – Email",        email: "Cashless@hitpa.co.in",            phone: null, mobile: null },
      { code: "HITPA",            name: "Arun Gadekar",    role: "Cashless – Email",        email: "Arun.gadekar@hitpa.co.in",        phone: null, mobile: null },
      { code: "PARAMOUNT",        name: "AL Request Desk", role: "Cashless – Email",        email: "Al.request@paramounttpa.com",     phone: null, mobile: null },
  ],
  commercials: [
  ],
  claims: [
  ],
};

// ── Pulse Superspeciality Hospital (demo data for presentations) ──────────────
// Same flow as a real hospital, but no real logins, documents or contacts.
const demoStats = (code: string, n: number): Stats => ({
  code, pending: 3 * n, approved: 18 * n, queries: 2 * n, rejected: n, todaysClaims: 2 * n, monthlyClaims: 24 * n,
  alReceived: 17 * n, enhancementPending: n, dischargePending: 2 * n, paymentReceived: 16 * n,
  totalAmountApproved: 560000 * n, totalAmountReceived: 520000 * n, totalAmountDeducted: 40000 * n,
  totalCasesProcessed: 24 * n, totalApprovedCases: 18 * n, totalDeniedCases: n,
});
const demoDoc = (code: string, type: string, title: string): Doc =>
  ({ code, type, title, url: `https://example.com/demo/${code.toLowerCase()}/${type.toLowerCase()}.pdf` });

const PULSE: HospitalSeed = {
  insurers: [
    { kind: "INSURER", name: "Star Health Insurance",           code: "STAR_HEALTH",   portalUrl: "https://vhi.vitraya.com/", selfChannel: true, sortOrder: 1 },
    { kind: "INSURER", name: "Niva Bupa Health Insurance",      code: "NIVA_BUPA",     portalUrl: "https://hospital.vitraya.com/", selfChannel: true, tpas: ["MEDI_ASSIST", "FHPL"], sortOrder: 2 },
    { kind: "INSURER", name: "ICICI Lombard General Insurance", code: "ICICI_LOMBARD", portalUrl: "https://ilhc.icicilombard.com", selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 3 },
    { kind: "INSURER", name: "HDFC Ergo General Insurance",     code: "HDFC_ERGO",     portalUrl: null, tpas: ["MEDI_ASSIST", "FHPL", "PARAMOUNT"], sortOrder: 4 },
    { kind: "TPA",     name: "Medi Assist TPA",                 code: "MEDI_ASSIST",   portalUrl: "https://provider.ihx.in/", sortOrder: 20 },
    { kind: "TPA",     name: "Family Health Plan TPA (FHPL)",   code: "FHPL",          portalUrl: "https://epreauth.fhpl.net/SearchPreauths.aspx", sortOrder: 21 },
    { kind: "TPA",     name: "Paramount TPA",                   code: "PARAMOUNT",     portalUrl: "https://provider.paramounttpa.com/", sortOrder: 22 },
  ],
  docs: [
    demoDoc("STAR_HEALTH", "HOSPITAL_CONTRACT", "Star Health MoU 2025-26"),
    demoDoc("STAR_HEALTH", "SURGICAL_PACKAGES", "Star Health Surgical Package Rates"),
    demoDoc("STAR_HEALTH", "SOP", "Star Health Pre-Auth SOP"),
    demoDoc("STAR_HEALTH", "ESCALATION_MATRIX", "Star Health Escalation Matrix"),
    demoDoc("NIVA_BUPA", "HOSPITAL_CONTRACT", "Niva Bupa Network Contract"),
    demoDoc("NIVA_BUPA", "SURGICAL_PACKAGES", "Niva Bupa Agreed Surgical Rates"),
    demoDoc("ICICI_LOMBARD", "SURGICAL_PACKAGES", "ICICI Lombard Package Rate List"),
    demoDoc("HDFC_ERGO", "SURGICAL_PACKAGES", "HDFC Ergo Package Rate List"),
    demoDoc("HDFC_ERGO", "CIRCULAR", "HDFC Ergo Circular Q3 2026"),
    demoDoc("MEDI_ASSIST", "SURGICAL_PACKAGES", "Medi Assist Rate Schedule"),
    demoDoc("MEDI_ASSIST", "CASHLESS_MANUAL", "Medi Assist Provider Manual"),
    demoDoc("FHPL", "SURGICAL_PACKAGES", "FHPL Surgical Rate Card"),
    demoDoc("FHPL", "FAQ", "FHPL Provider FAQs"),
    demoDoc("PARAMOUNT", "SOP", "Paramount Cashless SOP"),
  ],
  contacts: [
    { code: "STAR_HEALTH",   name: "Provider Relations", role: "Relationship Manager", email: "star.demo@example.com",       phone: "+91 00000 00001", mobile: null },
    { code: "NIVA_BUPA",     name: "Provider Services",  role: "Pre-Auth Desk",        email: "nivabupa.demo@example.com",   phone: "+91 00000 00002", mobile: null },
    { code: "ICICI_LOMBARD", name: "Cashless Desk",      role: "Claims Desk",          email: "icici.demo@example.com",      phone: "+91 00000 00003", mobile: null },
    { code: "HDFC_ERGO",     name: "Network Team",       role: "Network Manager",      email: "hdfcergo.demo@example.com",   phone: "+91 00000 00004", mobile: null },
    { code: "MEDI_ASSIST",   name: "TPA Coordinator",    role: "TPA Coordinator",      email: "mediassist.demo@example.com", phone: "+91 00000 00005", mobile: null },
    { code: "FHPL",          name: "Cashless Desk",      role: "Cashless – Email",     email: "fhpl.demo@example.com",       phone: null, mobile: null },
    { code: "PARAMOUNT",     name: "AL Request Desk",    role: "Cashless – Email",     email: "paramount.demo@example.com",  phone: null, mobile: null },
  ],
  commercials: [
    { code: "STAR_HEALTH",   category: "Surgery",     description: "Laparoscopic Surgery Discount", discountPercent: 12,   packageRate: null,   notes: "All laparoscopic procedures" },
    { code: "STAR_HEALTH",   category: "Maternity",   description: "C-Section Package",             discountPercent: null, packageRate: 65000,  notes: "Includes 5-day stay" },
    { code: "NIVA_BUPA",     category: "Neurology",   description: "Neurosurgery Discount",         discountPercent: 10,   packageRate: null,   notes: "Neurosurgery procedures" },
    { code: "ICICI_LOMBARD", category: "Cardiology",  description: "Angioplasty Package",           discountPercent: null, packageRate: 180000, notes: "Single stent" },
    { code: "HDFC_ERGO",     category: "Diagnostics", description: "Lab & Imaging Discount",        discountPercent: 15,   packageRate: null,   notes: "MRI/CT scans" },
  ],
  claims: [
    demoStats("STAR_HEALTH", 6), demoStats("NIVA_BUPA", 4), demoStats("ICICI_LOMBARD", 3), demoStats("HDFC_ERGO", 2),
    demoStats("MEDI_ASSIST", 5), demoStats("FHPL", 2), demoStats("PARAMOUNT", 1),
  ],
  // Same numbers across a portal's combinations on purpose: like the real scraper, IHX and FHPL
  // report one total for the whole login (scope PORTAL), saved separately per combination.
  portalStats: [
    { insurer: "NIVA_BUPA",     channel: "MEDI_ASSIST", portal: "IHX",  pending: 14, queries: 6, dischargePending: 4 },
    { insurer: "ICICI_LOMBARD", channel: "MEDI_ASSIST", portal: "IHX",  pending: 14, queries: 6, dischargePending: 4 },
    { insurer: "HDFC_ERGO",     channel: "MEDI_ASSIST", portal: "IHX",  pending: 14, queries: 6, dischargePending: 4 },
    { insurer: "NIVA_BUPA",     channel: "FHPL",        portal: "FHPL", pending: 5, queries: 2, approved: 31, rejected: 1 },
    { insurer: "HDFC_ERGO",     channel: "FHPL",        portal: "FHPL", pending: 5, queries: 2, approved: 31, rejected: 1 },
  ],
};

// ── Seeding ───────────────────────────────────────────────────────────────────

async function seedHospital(hospitalCode: string, data: HospitalSeed) {
  const hospital = await db.hospital.findUniqueOrThrow({ where: { code: hospitalCode } });
  const hospitalId = hospital.id;

  if (data.removedCodes?.length) {
    await db.insurer.updateMany({ where: { hospitalId, code: { in: data.removedCodes } }, data: { isActive: false } });
  }

  const insurers: Record<string, string> = {};
  for (const ins of data.insurers) {
    const fields = {
      name: ins.name, kind: ins.kind, portalUrl: ins.portalUrl,
      portalUsername: ins.portalUsername ?? null, portalPassword: ins.portalPassword ?? null,
      selfChannel: ins.selfChannel ?? false, isActive: ins.isActive ?? true, sortOrder: ins.sortOrder,
    };
    const record = await db.insurer.upsert({
      where:  { hospitalId_code: { hospitalId, code: ins.code } },
      update: fields,
      create: { hospitalId, code: ins.code, ...fields },
    });
    insurers[ins.code] = record.id;
  }

  // Insurer → TPA mapping (second pass, so every TPA row exists); always within this hospital
  for (const ins of data.insurers) {
    await db.insurer.update({
      where: { id: insurers[ins.code] },
      data:  { tpas: { set: (ins.tpas ?? []).map((code) => ({ id: insurers[code] })) } },
    });
  }

  // Replace seed-managed data. Documents added through the admin panel are kept.
  const insurerIds = Object.values(insurers);
  await db.document.deleteMany({
    where: {
      insurerId: { in: insurerIds },
      OR: [{ url: { startsWith: "https://example.com/" } }, { url: { startsWith: "/api/files/" } }],
    },
  });
  await db.contact.deleteMany({ where: { insurerId: { in: insurerIds } } });
  await db.commercial.deleteMany({ where: { insurerId: { in: insurerIds } } });

  for (const { code, ...d } of data.docs) {
    if (!insurers[code]) continue;
    await db.document.create({ data: { insurerId: insurers[code], ...d, isActive: true } });
  }
  for (const { code, ...c } of data.contacts) {
    if (!insurers[code]) continue;
    await db.contact.create({ data: { insurerId: insurers[code], ...c } });
  }
  for (const { code, ...c } of data.commercials) {
    if (!insurers[code]) continue;
    await db.commercial.create({ data: { insurerId: insurers[code], ...c } });
  }
  for (const { code, ...stats } of data.claims) {
    const insurerId = insurers[code];
    if (!insurerId) continue;
    await db.claimsStats.upsert({ where: { insurerId }, update: stats, create: { insurerId, ...stats } });
  }
  for (const { insurer, channel, portal, ...figures } of data.portalStats ?? []) {
    const insurerId = insurers[insurer], tpaId = insurers[channel];
    if (!insurerId || !tpaId) continue;
    const fields = { ...figures, portal, scope: "PORTAL", status: "OK", message: null, scrapedAt: new Date(), checkedAt: new Date() };
    await db.portalStats.upsert({
      where: { hospitalId_insurerId_tpaId: { hospitalId, insurerId, tpaId } },
      update: fields,
      create: { hospitalId, insurerId, tpaId, ...fields },
    });
  }

  console.log(`✅ ${hospital.name}: ${data.insurers.length} insurers/TPAs, ${data.docs.length} documents, ${data.contacts.length} contacts`);
}

/** Password for a newly created user: from the environment if set, otherwise random (printed once). */
function initialPassword(envVar: string): { password: string; generated: boolean } {
  const fromEnv = process.env[envVar];
  if (fromEnv) return { password: fromEnv, generated: false };
  return { password: randomBytes(12).toString("base64url"), generated: true };
}

async function main() {
  console.log("🌱 Seeding database...");

  const hospitalData = [
    { code: "PULSE",       name: "Pulse Superspeciality Hospital",        city: "Satara, Maharashtra", logoUrl: "/Pulse_Logo.png" },
    { code: "AJINKYATARA", name: "Ajinkyatara Multi-speciality Hospital", city: "Satara, Maharashtra", logoUrl: "/logos/ajinkyatara-icon.png" },
  ];
  const hospitals: Record<string, string> = {};
  for (const h of hospitalData) {
    const record = await db.hospital.upsert({
      where:  { code: h.code },
      update: { name: h.name, city: h.city, logoUrl: h.logoUrl },
      create: h,
    });
    hospitals[h.code] = record.id;
  }

  // Users. Passwords are only set when a user is first created and are never stored here.
  const userData = [
    { username: "admin",       role: "SUPER_ADMIN", name: "Administrator",                         hospital: "PULSE",       passwordEnv: "SEED_ADMIN_PASSWORD" },
    { username: "user",        role: "USER",        name: "User",                                  hospital: "PULSE",       passwordEnv: "SEED_USER_PASSWORD" },
    { username: "ajinkyatara", role: "USER",        name: "Ajinkyatara Multi-speciality Hospital", hospital: "AJINKYATARA", passwordEnv: "SEED_AJINKYATARA_PASSWORD" },
  ];
  for (const u of userData) {
    const hospitalId = hospitals[u.hospital];
    const existing = await db.user.findUnique({ where: { username: u.username } });
    if (existing) {
      await db.user.update({ where: { id: existing.id }, data: { name: u.name, role: u.role, hospitalId } });
      continue;
    }
    const { password, generated } = initialPassword(u.passwordEnv);
    await db.user.create({ data: { username: u.username, password: await bcrypt.hash(password, 12), role: u.role, name: u.name, hospitalId } });
    console.log(`  👤 Created ${u.username}${generated ? ` with password: ${password}` : ""}`);
  }
  console.log(`✅ Users: ${userData.map((u) => u.username).join(", ")}`);

  await seedHospital("AJINKYATARA", AJINKYATARA);
  await seedHospital("PULSE", PULSE);

  console.log("\n🎉 Database seeded successfully!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
