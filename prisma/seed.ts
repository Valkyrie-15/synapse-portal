import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const REMOVED_CODES = [
  "VIDAL_HEALTH", "RAKSHA_TPA", "NIVA_BUPA", "NVGT_CARE", "HERITAGE_HEALTH", "ICICI_LOMBARD",
  // Folded into the insurer's "Self" channel
  "BAJAJ_ALLIANZ_SELF", "CARE_HEALTH_SELF",
];

const IHX_URL  = "https://provider.ihx.in/";
const IHX_USER = "insuajinkyatara@gmail.com";
const IHX_PASS = "ihx@123";

async function main() {
  console.log("🌱 Seeding database...");

  // Deactivate removed insurers in existing DB
  await db.insurer.updateMany({
    where: { code: { in: REMOVED_CODES } },
    data: { isActive: false },
  });

  // Hospitals
  const hospitalData = [
    { code: "PULSE",       name: "Pulse Superspeciality Hospital",      city: "Satara, Maharashtra", logoUrl: "/Pulse_Logo.png" },
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
    console.log(`  ✅ Hospital: ${h.name}`);
  }

  // Users
  const userData = [
    { username: "admin",       password: "admin123",     role: "ADMIN", name: "Administrator",                    hospital: "PULSE" },
    { username: "user",        password: "user123",      role: "USER",  name: "User",                             hospital: "PULSE" },
    { username: "ajinkyatara", password: "XNxFvv38xHCf", role: "USER",  name: "Ajinkyatara Multi-speciality Hospital", hospital: "AJINKYATARA" },
  ];

  for (const u of userData) {
    const hospitalId = hospitals[u.hospital];
    // Existing passwords are never overwritten on re-seed
    await db.user.upsert({
      where:  { username: u.username },
      update: { name: u.name, hospitalId },
      create: { username: u.username, password: await bcrypt.hash(u.password, 12), role: u.role, name: u.name, hospitalId },
    });
  }

  console.log(`✅ Users: ${userData.map((u) => u.username).join(", ")}`);

  // Insurers & TPAs
  // Source: "Insurance Tie Up Information.xlsx" (tie-ups marked Y). Star Health kept for testing.
  // An insurer's own portal fields describe its "Self" channel (selfChannel: true); claims via a
  // TPA use the TPA's portal. portalUrl null => communicates via email (see contacts below).
  const ihx = { portalUrl: IHX_URL, portalUsername: IHX_USER, portalPassword: IHX_PASS };
  const PSU_TPAS = ["MEDI_ASSIST", "HEALTH_INDIA", "MD_INDIA", "ERICSON", "HITPA", "PARAMOUNT"];
  type Row = { name: string; code: string; kind: "INSURER" | "TPA"; portalUrl: string | null; portalUsername?: string | null; portalPassword?: string | null; selfChannel?: boolean; tpas?: string[]; sortOrder: number; isActive?: boolean };
  const insurerData: Row[] = [
    { kind: "INSURER", name: "Vitraya Health",                                     code: "VITRAYA",            portalUrl: "https://vhi.vitraya.com/preAuth/claims", sortOrder: 0, isActive: false },
    { kind: "INSURER", name: "Star Health Insurance",                              code: "STAR_HEALTH",        portalUrl: "https://vhi.vitraya.com/?returnUrl=%2FpreAuth%2Fclaims", selfChannel: true, sortOrder: 1 },
    // Insurance companies
    { kind: "INSURER", name: "National Insurance Company Ltd",                     code: "NATIONAL_INSURANCE", portalUrl: null, tpas: PSU_TPAS, sortOrder: 2 },
    { kind: "INSURER", name: "The New India Assurance Co. Ltd",                    code: "NEW_INDIA",          portalUrl: null, tpas: PSU_TPAS, sortOrder: 3 },
    { kind: "INSURER", name: "The Oriental Insurance Co. Ltd",                     code: "IHX",                portalUrl: null, tpas: PSU_TPAS, sortOrder: 4 },
    { kind: "INSURER", name: "United India Insurance Co. Ltd",                     code: "UNITED_INDIA",       portalUrl: null, tpas: PSU_TPAS, sortOrder: 5 },
    { kind: "INSURER", name: "ACKO General Insurance Limited",                     code: "ACKO",               portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 6 },
    { kind: "INSURER", name: "Aditya Birla Health Insurance Company Limited",      code: "ADITYA_BIRLA",       ...ihx, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 7 },
    { kind: "INSURER", name: "Bajaj Allianz General Insurance Company Limited",    code: "BAJAJ_ALLIANZ",      portalUrl: null, portalUsername: "ajinkya138236@hat.co.in", portalPassword: "ajinkya138236", selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 8 },
    { kind: "INSURER", name: "Care Health Insurance Company Limited",              code: "CARE_HEALTH",        portalUrl: null, portalUsername: "23850951", portalPassword: "babar11520226", selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 9 },
    { kind: "INSURER", name: "Generali Central Insurance Company Limited",         code: "GENERALI_CENTRAL",   portalUrl: null, portalUsername: "h587746", portalPassword: "FGH@123", selfChannel: true, sortOrder: 10 },
    { kind: "INSURER", name: "Go Digit General Insurance Limited",                 code: "GO_DIGIT",           portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 11 },
    { kind: "INSURER", name: "HDFC Ergo General Insurance Company Limited",        code: "HDFC_ERGO",          ...ihx, selfChannel: true, sortOrder: 12 },
    { kind: "INSURER", name: "Liberty General Insurance Limited",                  code: "LIBERTY",            portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 13 },
    { kind: "INSURER", name: "Magma General Insurance Limited",                    code: "MAGMA",              portalUrl: null, tpas: ["MEDI_ASSIST"], sortOrder: 14 },
    { kind: "INSURER", name: "Reliance General Insurance Company Limited",         code: "RELIANCE_GENERAL",   portalUrl: null, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 15 },
    { kind: "INSURER", name: "SBI General Insurance Company Limited",              code: "SBI_GENERAL",        portalUrl: null, selfChannel: true, tpas: ["MEDI_ASSIST"], sortOrder: 16 },
    { kind: "INSURER", name: "Tata AIG General Insurance Company Limited",         code: "TATA_AIG",           portalUrl: null, selfChannel: true, sortOrder: 17 },
    // TPAs
    { kind: "TPA", name: "Medi Assist Insurance TPA Private Limited",              code: "MEDI_ASSIST",        ...ihx, sortOrder: 20 },
    { kind: "TPA", name: "MD India Health Insurance TPA Private Limited",          code: "MD_INDIA",           ...ihx, sortOrder: 21 },
    { kind: "TPA", name: "Family Health Plan Insurance TPA Private Limited",       code: "FHPL",               portalUrl: "https://epreauth.fhpl.net/SearchPreauths.aspx", sortOrder: 22 },
    { kind: "TPA", name: "Paramount Health Services & Insurance TPA Private Limited", code: "PARAMOUNT",       ...ihx, sortOrder: 23 },
    { kind: "TPA", name: "East West Assist Insurance TPA Private Limited",         code: "VOLO_HEALTH",        portalUrl: "https://provider.volohealthtpa.com/home", portalUsername: "PRV7811_2", portalPassword: "Volo@10092026", sortOrder: 24 },
    { kind: "TPA", name: "Medsave Health Insurance TPA Limited",                   code: "MEDSAVE",            portalUrl: null, sortOrder: 25 },
    { kind: "TPA", name: "Health India Insurance TPA Services Private Limited",    code: "HEALTH_INDIA",       portalUrl: "https://www.healthindiatpa.com/Logins/LoginProvider.aspx", portalUsername: "74936", portalPassword: "74936", sortOrder: 26 },
    { kind: "TPA", name: "Ericson Insurance TPA Private Limited",                  code: "ERICSON",            portalUrl: null, sortOrder: 27 },
    { kind: "TPA", name: "Health Insurance TPA of India Limited",                  code: "HITPA",              portalUrl: null, sortOrder: 28 },
  ];

  const insurers: Record<string, string> = {};

  for (const ins of insurerData) {
    const fields = {
      name: ins.name, kind: ins.kind, portalUrl: ins.portalUrl,
      portalUsername: ins.portalUsername ?? null, portalPassword: ins.portalPassword ?? null,
      selfChannel: ins.selfChannel ?? false, isActive: ins.isActive ?? true, sortOrder: ins.sortOrder,
    };
    const record = await db.insurer.upsert({
      where:  { code: ins.code },
      update: fields,
      create: { code: ins.code, ...fields },
    });
    insurers[ins.code] = record.id;
    console.log(`  ✅ ${ins.kind === "TPA" ? "TPA" : "Insurer"}: ${ins.name}`);
  }

  // Insurer → TPA mapping (second pass, so every TPA row exists)
  for (const ins of insurerData) {
    await db.insurer.update({
      where: { code: ins.code },
      data:  { tpas: { set: (ins.tpas ?? []).map((code) => ({ code })) } },
    });
  }
  console.log("✅ Insurer → TPA mapping set");

  // Clear existing relational data to avoid duplicates on re-seed
  const activeInsurerIds = Object.values(insurers);
  // Only seed-managed documents (placeholders and files under /api/files/) are replaced;
  // documents added through the admin panel are kept.
  await db.document.deleteMany({
    where: {
      insurerId: { in: activeInsurerIds },
      OR: [{ url: { startsWith: "https://example.com/" } }, { url: { startsWith: "/api/files/" } }],
    },
  });
  await db.contact.deleteMany({ where: { insurerId: { in: activeInsurerIds } } });
  await db.commercial.deleteMany({ where: { insurerId: { in: activeInsurerIds } } });

  // Documents
  // Real documents live in storage/documents/<CODE>/ and are served (login required) by /api/files/
  const file = (code: string, name: string) => `/api/files/${code}/${name}`;
  const docs = [
    // Star Health placeholders kept for testing
    { code: "STAR_HEALTH", type: "HOSPITAL_CONTRACT",  title: "Star Health MoU 2024-25",             url: "https://example.com/star/contract.pdf" },
    { code: "STAR_HEALTH", type: "SURGICAL_PACKAGES",  title: "Star Health Surgical Package Rates",  url: "https://example.com/star/packages.pdf" },
    { code: "STAR_HEALTH", type: "SOP",                title: "Star Health Pre-Auth SOP",             url: "https://example.com/star/sop.pdf" },
    { code: "STAR_HEALTH", type: "CIRCULAR",           title: "Star Health Circular Q4 2024",         url: "https://example.com/star/circular-q4.pdf" },
    { code: "STAR_HEALTH", type: "CASHLESS_MANUAL",    title: "Star Health Cashless Manual v3",       url: "https://example.com/star/manual.pdf" },
    { code: "STAR_HEALTH", type: "ESCALATION_MATRIX",  title: "Star Health Escalation Matrix",        url: "https://example.com/star/escalation.pdf" },
    { code: "STAR_HEALTH", type: "FAQ",                title: "Star Health Provider FAQs",            url: "https://example.com/star/faq.pdf" },
    { code: "ADITYA_BIRLA",     type: "SURGICAL_PACKAGES", title: "Aditya Birla Rate List (from 22.05.2025)",       url: file("ADITYA_BIRLA", "aditya-birla-rate-list-2025-05-22.pdf") },
    { code: "RELIANCE_GENERAL", type: "SURGICAL_PACKAGES", title: "Reliance General (RGICL) Package Rate List",     url: file("RELIANCE_GENERAL", "reliance-gic-package-rate-list.pdf") },
    { code: "IHX",              type: "SURGICAL_PACKAGES", title: "Oriental Insurance GIPSA PPN Rate List",         url: file("IHX", "oriental-gipsa-ppn-rate-list.pdf") },
    { code: "HDFC_ERGO",        type: "SURGICAL_PACKAGES", title: "HDFC Ergo Package Rate List",                    url: file("HDFC_ERGO", "hdfc-ergo-package-rate-list.pdf") },
    { code: "BAJAJ_ALLIANZ",    type: "SURGICAL_PACKAGES", title: "Bajaj Allianz Acceptance Letter & Rate List",    url: file("BAJAJ_ALLIANZ", "bajaj-allianz-acceptance-letter-rate-list.pdf") },
    { code: "MEDI_ASSIST",      type: "SURGICAL_PACKAGES", title: "Medi Assist Rate List & Discount Letter",        url: file("MEDI_ASSIST", "medi-assist-rate-list-discount-letter.pdf") },
    { code: "ERICSON",          type: "SURGICAL_PACKAGES", title: "Ericson Renewal Rate List (15.05.2025)",         url: file("ERICSON", "ericson-renewal-rate-list-2025-05-15.pdf") },
    { code: "CARE_HEALTH",      type: "SURGICAL_PACKAGES", title: "Care Health Agreed Packages",                    url: file("CARE_HEALTH", "care-health-agreed-packages.pdf") },
  ];

  for (const doc of docs) {
    const insurerId = insurers[doc.code];
    if (!insurerId) continue;
    await db.document.create({
      data: { insurerId, type: doc.type as never, title: doc.title, url: doc.url, isActive: true },
    });
  }
  console.log(`✅ Documents: ${docs.length} seeded`);

  // Contacts
  const contacts = [
    { code: "STAR_HEALTH",  name: "Suresh Nair",     role: "Provider Relationship Manager", email: "suresh.nair@starhealth.in",    phone: "+91 44 6600 0000", mobile: "+91 99400 00000" },
    { code: "STAR_HEALTH",  name: "Meena Krishnan",  role: "Claims Desk",                   email: "claims@starhealth.in",         phone: "+91 44 6600 0001", mobile: null },
    { code: "NIVA_BUPA",    name: "Kavitha Reddy",   role: "Provider Services",             email: "kavitha.reddy@nivabupa.com",   phone: "+91 11 4160 7777", mobile: "+91 98110 00000" },
    { code: "NIVA_BUPA",    name: "Ramesh Choudhary",role: "Pre-Auth Specialist",           email: "preauth@nivabupa.com",         phone: "+91 11 4160 7778", mobile: null },
    { code: "MEDI_ASSIST",  name: "Divya Pillai",    role: "TPA Coordinator",               email: "divya.pillai@mediassist.in",   phone: "+91 80 4120 0000", mobile: "+91 99000 12345" },
    { code: "MEDI_ASSIST",  name: "Santosh Kumar",   role: "Claims Manager",                email: "claims@mediassist.in",         phone: "+91 80 4120 0001", mobile: null },
    { code: "FHPL",         name: "Rashmi Joshi",    role: "Network Manager",               email: "rashmi.joshi@fhpl.net",        phone: "+91 40 6660 0000", mobile: "+91 94400 00000" },
    { code: "MD_INDIA",     name: "Naresh Gupta",    role: "Claims Head",                   email: "naresh.gupta@mdindia.com",     phone: "+91 80 4090 0000", mobile: "+91 98450 11111" },
    // Email-based cashless desks (from tie-up sheet)
    { code: "RELIANCE_GENERAL", name: "Healthcare Desk", role: "Cashless (Self) – Email", email: "healthcare@indusindinsurance.com", phone: null, mobile: null },
    { code: "SBI_GENERAL",      name: "Cashless Health", role: "Cashless (Self) – Email", email: "cashless.health@sbigeneral.in",   phone: null, mobile: null },
    { code: "TATA_AIG",         name: "Preauth Desk",    role: "Cashless – Email",        email: "preauth@tataaig.com",             phone: null, mobile: null },
    { code: "FHPL",             name: "Cashless Desk",   role: "Cashless – Email",        email: "Cashless@fhpl.net",               phone: null, mobile: null },
    { code: "MEDSAVE",          name: "Cashless Desk",   role: "Cashless – Email",        email: "cashless@medsave.in",             phone: null, mobile: null },
    { code: "ERICSON",          name: "Cashless Desk",   role: "Cashless – Email",        email: "cashless@ericsontpa.com",         phone: null, mobile: null },
    { code: "HITPA",            name: "Cashless Desk",   role: "Cashless – Email",        email: "cashless@hitpa.co.in",            phone: null, mobile: null },
  ];

  for (const c of contacts) {
    const insurerId = insurers[c.code];
    if (!insurerId) continue;
    await db.contact.create({
      data: { insurerId, name: c.name, role: c.role, email: c.email, phone: c.phone, mobile: c.mobile },
    });
  }
  console.log(`✅ Contacts: ${contacts.length} seeded`);

  // Commercials
  const commercials = [
    { code: "STAR_HEALTH", category: "Surgery",    description: "Laparoscopic Surgery Discount", discountPercent: 12,   packageRate: null,   notes: "All laparoscopic procedures" },
    { code: "STAR_HEALTH", category: "ICU",        description: "ICU Day Charge Cap",            discountPercent: null, packageRate: 8000,   notes: "Per day cap for ventilated patients" },
    { code: "STAR_HEALTH", category: "Maternity",  description: "C-Section Package",             discountPercent: null, packageRate: 65000,  notes: "Includes 5-day stay" },
    { code: "NIVA_BUPA",   category: "Renal",      description: "Kidney Transplant Package",     discountPercent: null, packageRate: 750000, notes: "Includes 21-day monitoring" },
    { code: "NIVA_BUPA",   category: "Neurology",  description: "Brain Surgery Discount",        discountPercent: 12,   packageRate: null,   notes: "Neurosurgery procedures" },
    { code: "MEDI_ASSIST", category: "Surgery",    description: "General Surgical Discount",     discountPercent: 10,   packageRate: null,   notes: "Standard empanelment terms" },
    { code: "FHPL",        category: "Diagnostics",description: "Lab & Imaging Discount",        discountPercent: 20,   packageRate: null,   notes: "MRI/CT/PET scans" },
    { code: "MD_INDIA",    category: "Maternity",  description: "Normal Delivery Rate",          discountPercent: null, packageRate: 30000,  notes: "Tier 2 city hospitals" },
  ];

  for (const c of commercials) {
    const insurerId = insurers[c.code];
    if (!insurerId) continue;
    await db.commercial.create({
      data: { insurerId, category: c.category, description: c.description, discountPercent: c.discountPercent, packageRate: c.packageRate, notes: c.notes },
    });
  }
  console.log(`✅ Commercials: ${commercials.length} seeded`);

  // Claims stats
  const claimsData = [
    { code: "VITRAYA",      pending: 28, approved: 142, queries: 12, rejected: 8,  todaysClaims: 15, monthlyClaims: 190, alReceived: 135, enhancementPending: 9,  dischargePending: 11, paymentReceived: 128, totalAmountApproved: 4250000, totalAmountReceived: 3980000, totalAmountDeducted: 270000, totalCasesProcessed: 190, totalApprovedCases: 142, totalDeniedCases: 8  },
    { code: "STAR_HEALTH",  pending: 45, approved: 312, queries: 23, rejected: 18, todaysClaims: 28, monthlyClaims: 398, alReceived: 298, enhancementPending: 17, dischargePending: 22, paymentReceived: 284, totalAmountApproved: 9870000, totalAmountReceived: 9200000, totalAmountDeducted: 670000, totalCasesProcessed: 398, totalApprovedCases: 312, totalDeniedCases: 18 },
    { code: "NIVA_BUPA",    pending: 52, approved: 234, queries: 28, rejected: 16, todaysClaims: 22, monthlyClaims: 330, alReceived: 222, enhancementPending: 18, dischargePending: 24, paymentReceived: 210, totalAmountApproved: 7010000, totalAmountReceived: 6550000, totalAmountDeducted: 460000, totalCasesProcessed: 330, totalApprovedCases: 234, totalDeniedCases: 16 },
    { code: "MEDI_ASSIST",  pending: 41, approved: 187, queries: 19, rejected: 13, todaysClaims: 17, monthlyClaims: 260, alReceived: 178, enhancementPending: 14, dischargePending: 18, paymentReceived: 168, totalAmountApproved: 5580000, totalAmountReceived: 5210000, totalAmountDeducted: 370000, totalCasesProcessed: 260, totalApprovedCases: 187, totalDeniedCases: 13 },
    { code: "FHPL",         pending: 18, approved: 112, queries: 9,  rejected: 5,  todaysClaims: 10, monthlyClaims: 144, alReceived: 106, enhancementPending: 6,  dischargePending: 8,  paymentReceived: 100, totalAmountApproved: 3320000, totalAmountReceived: 3100000, totalAmountDeducted: 220000, totalCasesProcessed: 144, totalApprovedCases: 112, totalDeniedCases: 5  },
    { code: "MD_INDIA",     pending: 29, approved: 156, queries: 14, rejected: 9,  todaysClaims: 14, monthlyClaims: 208, alReceived: 148, enhancementPending: 10, dischargePending: 13, paymentReceived: 140, totalAmountApproved: 4670000, totalAmountReceived: 4370000, totalAmountDeducted: 300000, totalCasesProcessed: 208, totalApprovedCases: 156, totalDeniedCases: 9  },
    { code: "IHX",          pending: 31, approved: 164, queries: 16, rejected: 10, todaysClaims: 14, monthlyClaims: 221, alReceived: 156, enhancementPending: 11, dischargePending: 14, paymentReceived: 148, totalAmountApproved: 4920000, totalAmountReceived: 4600000, totalAmountDeducted: 320000, totalCasesProcessed: 221, totalApprovedCases: 164, totalDeniedCases: 10 },
    { code: "VOLO_HEALTH",  pending: 19, approved: 98,  queries: 10, rejected: 6,  todaysClaims: 9,  monthlyClaims: 133, alReceived: 93,  enhancementPending: 6,  dischargePending: 8,  paymentReceived: 87,  totalAmountApproved: 2940000, totalAmountReceived: 2750000, totalAmountDeducted: 190000, totalCasesProcessed: 133, totalApprovedCases: 98,  totalDeniedCases: 6  },
    { code: "HEALTH_INDIA", pending: 26, approved: 141, queries: 13, rejected: 9,  todaysClaims: 12, monthlyClaims: 189, alReceived: 134, enhancementPending: 9,  dischargePending: 12, paymentReceived: 126, totalAmountApproved: 4220000, totalAmountReceived: 3950000, totalAmountDeducted: 270000, totalCasesProcessed: 189, totalApprovedCases: 141, totalDeniedCases: 9  },
    { code: "NVGT_CARE",   pending: 21, approved: 118, queries: 11, rejected: 7,  todaysClaims: 10, monthlyClaims: 157, alReceived: 112, enhancementPending: 7,  dischargePending: 9,  paymentReceived: 105, totalAmountApproved: 3510000, totalAmountReceived: 3280000, totalAmountDeducted: 230000, totalCasesProcessed: 157, totalApprovedCases: 118, totalDeniedCases: 7  },
    { code: "PARAMOUNT",    pending: 37, approved: 175, queries: 21, rejected: 14, todaysClaims: 16, monthlyClaims: 247, alReceived: 166, enhancementPending: 13, dischargePending: 16, paymentReceived: 157, totalAmountApproved: 5230000, totalAmountReceived: 4890000, totalAmountDeducted: 340000, totalCasesProcessed: 247, totalApprovedCases: 175, totalDeniedCases: 14 },
    { code: "UNITED_INDIA", pending: 22, approved: 124, queries: 12, rejected: 8,  todaysClaims: 11, monthlyClaims: 166, alReceived: 118, enhancementPending: 8,  dischargePending: 10, paymentReceived: 112, totalAmountApproved: 3710000, totalAmountReceived: 3470000, totalAmountDeducted: 240000, totalCasesProcessed: 166, totalApprovedCases: 124, totalDeniedCases: 8  },
    { code: "ADITYA_BIRLA", pending: 34, approved: 196, queries: 18, rejected: 12, todaysClaims: 18, monthlyClaims: 260, alReceived: 186, enhancementPending: 12, dischargePending: 15, paymentReceived: 175, totalAmountApproved: 5850000, totalAmountReceived: 5470000, totalAmountDeducted: 380000, totalCasesProcessed: 260, totalApprovedCases: 196, totalDeniedCases: 12 },
  ];

  for (const { code, ...stats } of claimsData) {
    const insurerId = insurers[code];
    if (!insurerId) continue;
    await db.claimsStats.upsert({
      where:  { insurerId },
      update: { ...stats },
      create: { insurerId, ...stats },
    });
  }
  console.log(`✅ Claims stats: ${claimsData.length} seeded`);

  console.log("\n🎉 Database seeded successfully!");
  console.log("   Admin: admin / admin123");
  console.log("   User:  user / user123");
  console.log("   Ajinkyatara: ajinkyatara / XNxFvv38xHCf");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => db.$disconnect());
