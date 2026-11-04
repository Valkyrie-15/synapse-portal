import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const REMOVED_CODES = ["VIDAL_HEALTH", "RAKSHA_TPA", "NIVA_BUPA", "NVGT_CARE", "HERITAGE_HEALTH", "ICICI_LOMBARD"];

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
    { code: "AJINKYATARA", name: "Ajinkyatara Multi-speciality Hospital", city: null,                logoUrl: "/logos/ajinkyatara-icon.png" },
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

  // Insurers
  // Source: "Insurance Tie Up Information.xlsx" (tie-ups marked Y). Star Health kept for testing.
  // portalUrl null => insurer communicates via email (see contacts below).
  const ihx = { portalUrl: IHX_URL, portalUsername: IHX_USER, portalPassword: IHX_PASS };
  const insurerData: { name: string; code: string; portalUrl: string | null; portalUsername?: string | null; portalPassword?: string | null; sortOrder: number; isActive?: boolean }[] = [
    { name: "Vitraya Health",                                     code: "VITRAYA",            portalUrl: "https://vhi.vitraya.com/preAuth/claims", sortOrder: 0, isActive: false },
    { name: "Star Health Insurance",                              code: "STAR_HEALTH",        portalUrl: "https://vhi.vitraya.com/?returnUrl=%2FpreAuth%2Fclaims", sortOrder: 1 },
    // Insurance companies
    { name: "National Insurance Company Ltd",                     code: "NATIONAL_INSURANCE", ...ihx, sortOrder: 2 },
    { name: "The New India Assurance Co. Ltd",                    code: "NEW_INDIA",          ...ihx, sortOrder: 3 },
    { name: "The Oriental Insurance Co. Ltd",                     code: "IHX",                ...ihx, sortOrder: 4 },
    { name: "United India Insurance Co. Ltd",                     code: "UNITED_INDIA",       ...ihx, sortOrder: 5 },
    { name: "ACKO General Insurance Limited",                     code: "ACKO",               ...ihx, sortOrder: 6 },
    { name: "Aditya Birla Health Insurance Company Limited",      code: "ADITYA_BIRLA",       ...ihx, sortOrder: 7 },
    { name: "Bajaj Allianz General Insurance Company Limited",    code: "BAJAJ_ALLIANZ",      ...ihx, sortOrder: 8 },
    { name: "Bajaj Allianz (Hospital Portal)",                    code: "BAJAJ_ALLIANZ_SELF", portalUrl: null, portalUsername: "ajinkya138236@hat.co.in", portalPassword: "ajinkya138236", sortOrder: 9 },
    { name: "Care Health Insurance Company Limited",              code: "CARE_HEALTH",        ...ihx, sortOrder: 10 },
    { name: "Care Health (Care Portal)",                          code: "CARE_HEALTH_SELF",   portalUrl: null, portalUsername: "23850951", portalPassword: "babar11520226", sortOrder: 11 },
    { name: "Generali Central Insurance Company Limited",         code: "GENERALI_CENTRAL",   portalUrl: null, portalUsername: "h587746", portalPassword: "FGH@123", sortOrder: 12 },
    { name: "Go Digit General Insurance Limited",                 code: "GO_DIGIT",           ...ihx, sortOrder: 13 },
    { name: "HDFC Ergo General Insurance Company Limited",        code: "HDFC_ERGO",          ...ihx, sortOrder: 14 },
    { name: "Liberty General Insurance Limited",                  code: "LIBERTY",            ...ihx, sortOrder: 15 },
    { name: "Magma General Insurance Limited",                    code: "MAGMA",              ...ihx, sortOrder: 16 },
    { name: "Reliance General Insurance Company Limited",         code: "RELIANCE_GENERAL",   ...ihx, sortOrder: 17 },
    { name: "SBI General Insurance Company Limited",              code: "SBI_GENERAL",        ...ihx, sortOrder: 18 },
    { name: "Tata AIG General Insurance Company Limited",         code: "TATA_AIG",           portalUrl: null, sortOrder: 19 },
    // TPAs
    { name: "Medi Assist Insurance TPA Private Limited",          code: "MEDI_ASSIST",        ...ihx, sortOrder: 20 },
    { name: "MD India Health Insurance TPA Private Limited",      code: "MD_INDIA",           ...ihx, sortOrder: 21 },
    { name: "Family Health Plan Insurance TPA Private Limited",   code: "FHPL",               portalUrl: "https://epreauth.fhpl.net/SearchPreauths.aspx", sortOrder: 22 },
    { name: "Paramount Health Services & Insurance TPA Private Limited", code: "PARAMOUNT",   ...ihx, sortOrder: 23 },
    { name: "East West Assist Insurance TPA Private Limited",     code: "VOLO_HEALTH",        portalUrl: "https://provider.volohealthtpa.com/home", portalUsername: "PRV7811_2", portalPassword: "Volo@10092026", sortOrder: 24 },
    { name: "Medsave Health Insurance TPA Limited",               code: "MEDSAVE",            portalUrl: null, sortOrder: 25 },
    { name: "Health India Insurance TPA Services Private Limited", code: "HEALTH_INDIA",      portalUrl: "https://www.healthindiatpa.com/Logins/LoginProvider.aspx", portalUsername: "74936", portalPassword: "74936", sortOrder: 26 },
    { name: "Ericson Insurance TPA Private Limited",              code: "ERICSON",            portalUrl: null, sortOrder: 27 },
    { name: "Health Insurance TPA of India Limited",              code: "HITPA",              portalUrl: null, sortOrder: 28 },
  ];

  const insurers: Record<string, string> = {};

  for (const ins of insurerData) {
    const record = await db.insurer.upsert({
      where:  { code: ins.code },
      update: { name: ins.name, portalUrl: ins.portalUrl, portalUsername: ins.portalUsername ?? null, portalPassword: ins.portalPassword ?? null, isActive: ins.isActive ?? true, sortOrder: ins.sortOrder },
      create: { ...ins, isActive: ins.isActive ?? true },
    });
    insurers[ins.code] = record.id;
    console.log(`  ✅ Insurer: ${ins.name}`);
  }

  // Clear existing relational data to avoid duplicates on re-seed
  const activeInsurerIds = Object.values(insurers);
  await db.document.deleteMany({ where: { insurerId: { in: activeInsurerIds } } });
  await db.contact.deleteMany({ where: { insurerId: { in: activeInsurerIds } } });
  await db.commercial.deleteMany({ where: { insurerId: { in: activeInsurerIds } } });

  // Documents
  const docs = [
    { code: "STAR_HEALTH", type: "HOSPITAL_CONTRACT",  title: "Star Health MoU 2024-25",             url: "https://example.com/star/contract.pdf" },
    { code: "STAR_HEALTH", type: "SURGICAL_PACKAGES",  title: "Star Health Surgical Package Rates",  url: "https://example.com/star/packages.pdf" },
    { code: "STAR_HEALTH", type: "SOP",                title: "Star Health Pre-Auth SOP",             url: "https://example.com/star/sop.pdf" },
    { code: "STAR_HEALTH", type: "CIRCULAR",           title: "Star Health Circular Q4 2024",         url: "https://example.com/star/circular-q4.pdf" },
    { code: "STAR_HEALTH", type: "CASHLESS_MANUAL",    title: "Star Health Cashless Manual v3",       url: "https://example.com/star/manual.pdf" },
    { code: "STAR_HEALTH", type: "ESCALATION_MATRIX",  title: "Star Health Escalation Matrix",        url: "https://example.com/star/escalation.pdf" },
    { code: "STAR_HEALTH", type: "FAQ",                title: "Star Health Provider FAQs",            url: "https://example.com/star/faq.pdf" },
    { code: "NIVA_BUPA",   type: "HOSPITAL_CONTRACT",  title: "Niva Bupa Network Contract 2024",      url: "https://example.com/niva/contract.pdf" },
    { code: "NIVA_BUPA",   type: "SURGICAL_PACKAGES",  title: "Niva Bupa Agreed Surgical Rates",      url: "https://example.com/niva/packages.pdf" },
    { code: "NIVA_BUPA",   type: "SOP",                title: "Niva Bupa Pre-Auth & Discharge SOP",   url: "https://example.com/niva/sop.pdf" },
    { code: "NIVA_BUPA",   type: "CASHLESS_MANUAL",    title: "Niva Bupa Provider Manual",            url: "https://example.com/niva/manual.pdf" },
    { code: "NIVA_BUPA",   type: "ESCALATION_MATRIX",  title: "Niva Bupa Escalation Matrix 2025",     url: "https://example.com/niva/escalation.pdf" },
    { code: "MEDI_ASSIST", type: "HOSPITAL_CONTRACT",  title: "Medi Assist TPA Agreement",            url: "https://example.com/mediassist/contract.pdf" },
    { code: "MEDI_ASSIST", type: "SURGICAL_PACKAGES",  title: "Medi Assist Rate Schedule",            url: "https://example.com/mediassist/packages.pdf" },
    { code: "MEDI_ASSIST", type: "SOP",                title: "Medi Assist Cashless SOP",             url: "https://example.com/mediassist/sop.pdf" },
    { code: "MEDI_ASSIST", type: "CASHLESS_MANUAL",    title: "Medi Assist Provider Manual",          url: "https://example.com/mediassist/manual.pdf" },
    { code: "FHPL",        type: "HOSPITAL_CONTRACT",  title: "FHPL Network Agreement 2024",          url: "https://example.com/fhpl/contract.pdf" },
    { code: "FHPL",        type: "SURGICAL_PACKAGES",  title: "FHPL Surgical Rate Card",              url: "https://example.com/fhpl/packages.pdf" },
    { code: "FHPL",        type: "CASHLESS_MANUAL",    title: "FHPL Cashless Process Manual",         url: "https://example.com/fhpl/manual.pdf" },
    { code: "MD_INDIA",    type: "HOSPITAL_CONTRACT",  title: "MD India Hospital Agreement",          url: "https://example.com/mdindia/contract.pdf" },
    { code: "MD_INDIA",    type: "SURGICAL_PACKAGES",  title: "MD India Package Rates",               url: "https://example.com/mdindia/packages.pdf" },
    { code: "MD_INDIA",    type: "SOP",                title: "MD India Provider SOP",                url: "https://example.com/mdindia/sop.pdf" },
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
