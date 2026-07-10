import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Users
  const adminHash = await bcrypt.hash("admin123", 12);
  const userHash = await bcrypt.hash("user123", 12);

  const admin = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminHash,
      role: "ADMIN",
      name: "Administrator",
    },
  });

  const regularUser = await db.user.upsert({
    where: { username: "user" },
    update: { name: "User" },
    create: {
      username: "user",
      password: userHash,
      role: "USER",
      name: "User",
    },
  });

  console.log(`✅ Users: ${admin.username}, ${regularUser.username}`);

  // Insurers
  const insurerData = [
    {
      name: "Vitraya Health",
      code: "VITRAYA",
      portalUrl: "https://insurer.vitraya.com/login",
      sortOrder: 1,
      isActive: false,
    },
    {
      name: "Star Health Insurance",
      code: "STAR_HEALTH",
      portalUrl: "https://insurer.vitraya.com/login",
      sortOrder: 2,
    },
    {
      name: "ICICI Lombard",
      code: "ICICI_LOMBARD",
      portalUrl: "https://www.icicilombard.com/health-insurance/cashless-hospitals",
      sortOrder: 3,
    },
    {
      name: "HDFC Ergo",
      code: "HDFC_ERGO",
      portalUrl: "https://www.hdfcergo.com/health-insurance/cashless-claims",
      sortOrder: 4,
    },
    {
      name: "Niva Bupa",
      code: "NIVA_BUPA",
      portalUrl: "https://www.nivabupa.com/health-insurance/cashless-hospitals.html",
      sortOrder: 5,
    },
    {
      name: "Medi Assist",
      code: "MEDI_ASSIST",
      portalUrl: "https://www.mediassist.in",
      sortOrder: 6,
    },
    {
      name: "Vidal Health",
      code: "VIDAL_HEALTH",
      portalUrl: "https://www.vidalhealth.com",
      sortOrder: 7,
    },
    {
      name: "FHPL",
      code: "FHPL",
      portalUrl: "https://www.fhpl.net",
      sortOrder: 8,
    },
    {
      name: "MD India",
      code: "MD_INDIA",
      portalUrl: "https://www.mdindia.com",
      sortOrder: 9,
    },
    {
      name: "Paramount TPA",
      code: "PARAMOUNT",
      portalUrl: "https://www.paramounttpa.com",
      sortOrder: 10,
    },
    {
      name: "Raksha TPA",
      code: "RAKSHA_TPA",
      portalUrl: "https://www.rakshatpa.com",
      sortOrder: 11,
    },
  ];

  const insurers: Record<string, string> = {};

  for (const ins of insurerData) {
    const record = await db.insurer.upsert({
      where: { code: ins.code },
      update: { portalUrl: ins.portalUrl, isActive: ins.isActive ?? true },
      create: { ...ins, isActive: ins.isActive ?? true },
    });
    insurers[ins.code] = record.id;
    console.log(`  ✅ Insurer: ${ins.name}`);
  }

  // Documents
  const docs = [
    // Vitraya
    { code: "VITRAYA", type: "HOSPITAL_CONTRACT", title: "Vitraya Hospital Agreement 2024-25", url: "https://example.com/vitraya/hospital-contract-2024.pdf" },
    { code: "VITRAYA", type: "SURGICAL_PACKAGES", title: "Vitraya Agreed Surgical Rates 2024", url: "https://example.com/vitraya/surgical-packages-2024.pdf" },
    { code: "VITRAYA", type: "SOP", title: "Vitraya Cashless Processing SOP", url: "https://example.com/vitraya/sop.pdf" },
    { code: "VITRAYA", type: "CIRCULAR", title: "Vitraya Provider Circular - June 2025", url: "https://example.com/vitraya/circular-jun-2025.pdf" },
    { code: "VITRAYA", type: "CASHLESS_MANUAL", title: "Vitraya Cashless Operations Manual", url: "https://example.com/vitraya/cashless-manual.pdf" },
    { code: "VITRAYA", type: "ESCALATION_MATRIX", title: "Vitraya Escalation Matrix 2025", url: "https://example.com/vitraya/escalation-matrix.pdf" },
    { code: "VITRAYA", type: "FAQ", title: "Vitraya Provider FAQs", url: "https://example.com/vitraya/faqs.pdf" },
    // Star Health
    { code: "STAR_HEALTH", type: "HOSPITAL_CONTRACT", title: "Star Health MoU 2024-25", url: "https://example.com/star/contract.pdf" },
    { code: "STAR_HEALTH", type: "SURGICAL_PACKAGES", title: "Star Health Surgical Package Rates", url: "https://example.com/star/packages.pdf" },
    { code: "STAR_HEALTH", type: "SOP", title: "Star Health Pre-Auth SOP", url: "https://example.com/star/sop.pdf" },
    { code: "STAR_HEALTH", type: "CIRCULAR", title: "Star Health Circular Q4 2024", url: "https://example.com/star/circular-q4.pdf" },
    { code: "STAR_HEALTH", type: "CASHLESS_MANUAL", title: "Star Health Cashless Manual v3", url: "https://example.com/star/manual.pdf" },
    { code: "STAR_HEALTH", type: "ESCALATION_MATRIX", title: "Star Health Escalation Matrix", url: "https://example.com/star/escalation.pdf" },
    { code: "STAR_HEALTH", type: "FAQ", title: "Star Health Provider FAQs", url: "https://example.com/star/faq.pdf" },
    // ICICI Lombard
    { code: "ICICI_LOMBARD", type: "HOSPITAL_CONTRACT", title: "ICICI Lombard Network Agreement", url: "https://example.com/icici/contract.pdf" },
    { code: "ICICI_LOMBARD", type: "SURGICAL_PACKAGES", title: "ICICI Lombard Package Rates 2025", url: "https://example.com/icici/packages.pdf" },
    { code: "ICICI_LOMBARD", type: "SOP", title: "ICICI Lombard Cashless SOP", url: "https://example.com/icici/sop.pdf" },
    { code: "ICICI_LOMBARD", type: "CIRCULAR", title: "ICICI Lombard Provider Update July 2025", url: "https://example.com/icici/circular.pdf" },
    { code: "ICICI_LOMBARD", type: "CASHLESS_MANUAL", title: "ICICI Lombard Hospital Manual", url: "https://example.com/icici/manual.pdf" },
    { code: "ICICI_LOMBARD", type: "ESCALATION_MATRIX", title: "ICICI Lombard Escalation Contacts", url: "https://example.com/icici/escalation.pdf" },
    { code: "ICICI_LOMBARD", type: "FAQ", title: "ICICI Lombard Hospital FAQs", url: "https://example.com/icici/faq.pdf" },
    // HDFC Ergo
    { code: "HDFC_ERGO", type: "HOSPITAL_CONTRACT", title: "HDFC Ergo Hospital MoU 2025", url: "https://example.com/hdfc/contract.pdf" },
    { code: "HDFC_ERGO", type: "SURGICAL_PACKAGES", title: "HDFC Ergo Revised Package Rates", url: "https://example.com/hdfc/packages.pdf" },
    { code: "HDFC_ERGO", type: "SOP", title: "HDFC Ergo Claims Processing SOP", url: "https://example.com/hdfc/sop.pdf" },
    { code: "HDFC_ERGO", type: "CASHLESS_MANUAL", title: "HDFC Ergo Cashless Manual 2025", url: "https://example.com/hdfc/manual.pdf" },
    // Niva Bupa
    { code: "NIVA_BUPA", type: "HOSPITAL_CONTRACT", title: "Niva Bupa Network Contract 2024", url: "https://example.com/niva/contract.pdf" },
    { code: "NIVA_BUPA", type: "SURGICAL_PACKAGES", title: "Niva Bupa Agreed Surgical Rates", url: "https://example.com/niva/packages.pdf" },
    { code: "NIVA_BUPA", type: "SOP", title: "Niva Bupa Pre-Auth & Discharge SOP", url: "https://example.com/niva/sop.pdf" },
    { code: "NIVA_BUPA", type: "CASHLESS_MANUAL", title: "Niva Bupa Provider Manual", url: "https://example.com/niva/manual.pdf" },
    { code: "NIVA_BUPA", type: "ESCALATION_MATRIX", title: "Niva Bupa Escalation Matrix 2025", url: "https://example.com/niva/escalation.pdf" },
    // Medi Assist
    { code: "MEDI_ASSIST", type: "HOSPITAL_CONTRACT", title: "Medi Assist TPA Agreement", url: "https://example.com/mediassist/contract.pdf" },
    { code: "MEDI_ASSIST", type: "SURGICAL_PACKAGES", title: "Medi Assist Rate Schedule", url: "https://example.com/mediassist/packages.pdf" },
    { code: "MEDI_ASSIST", type: "SOP", title: "Medi Assist Cashless SOP", url: "https://example.com/mediassist/sop.pdf" },
    { code: "MEDI_ASSIST", type: "CASHLESS_MANUAL", title: "Medi Assist Provider Manual", url: "https://example.com/mediassist/manual.pdf" },
    // Vidal Health
    { code: "VIDAL_HEALTH", type: "HOSPITAL_CONTRACT", title: "Vidal Health Agreement 2025", url: "https://example.com/vidal/contract.pdf" },
    { code: "VIDAL_HEALTH", type: "SURGICAL_PACKAGES", title: "Vidal Health Surgical Packages", url: "https://example.com/vidal/packages.pdf" },
    { code: "VIDAL_HEALTH", type: "SOP", title: "Vidal Health Cashless SOP", url: "https://example.com/vidal/sop.pdf" },
    // FHPL
    { code: "FHPL", type: "HOSPITAL_CONTRACT", title: "FHPL Network Agreement 2024", url: "https://example.com/fhpl/contract.pdf" },
    { code: "FHPL", type: "SURGICAL_PACKAGES", title: "FHPL Surgical Rate Card", url: "https://example.com/fhpl/packages.pdf" },
    { code: "FHPL", type: "CASHLESS_MANUAL", title: "FHPL Cashless Process Manual", url: "https://example.com/fhpl/manual.pdf" },
    // MD India
    { code: "MD_INDIA", type: "HOSPITAL_CONTRACT", title: "MD India Hospital Agreement", url: "https://example.com/mdindia/contract.pdf" },
    { code: "MD_INDIA", type: "SURGICAL_PACKAGES", title: "MD India Package Rates", url: "https://example.com/mdindia/packages.pdf" },
    { code: "MD_INDIA", type: "SOP", title: "MD India Provider SOP", url: "https://example.com/mdindia/sop.pdf" },
    // Paramount
    { code: "PARAMOUNT", type: "HOSPITAL_CONTRACT", title: "Paramount TPA Agreement 2025", url: "https://example.com/paramount/contract.pdf" },
    { code: "PARAMOUNT", type: "SURGICAL_PACKAGES", title: "Paramount Surgical Rates", url: "https://example.com/paramount/packages.pdf" },
    { code: "PARAMOUNT", type: "CASHLESS_MANUAL", title: "Paramount Cashless Manual", url: "https://example.com/paramount/manual.pdf" },
    // Raksha
    { code: "RAKSHA_TPA", type: "HOSPITAL_CONTRACT", title: "Raksha TPA Network Agreement", url: "https://example.com/raksha/contract.pdf" },
    { code: "RAKSHA_TPA", type: "SURGICAL_PACKAGES", title: "Raksha TPA Rate Schedule 2025", url: "https://example.com/raksha/packages.pdf" },
    { code: "RAKSHA_TPA", type: "SOP", title: "Raksha TPA Pre-Auth SOP", url: "https://example.com/raksha/sop.pdf" },
  ];

  for (const doc of docs) {
    const insurerId = insurers[doc.code];
    if (!insurerId) continue;
    await db.document.create({
      data: {
        insurerId,
        type: doc.type as never,
        title: doc.title,
        url: doc.url,
        isActive: true,
      },
    });
  }
  console.log(`✅ Documents: ${docs.length} seeded`);

  // Contacts
  const contacts = [
    { code: "VITRAYA", name: "Priya Menon", role: "Claims Relationship Manager", email: "priya.menon@vitraya.in", phone: "+91 22 4567 8901", mobile: "+91 98765 43210" },
    { code: "VITRAYA", name: "Rajesh Kumar", role: "Pre-Auth Desk", email: "preauth@vitraya.in", phone: "+91 22 4567 8902", mobile: "+91 98765 43211" },
    { code: "VITRAYA", name: "Anita Sharma", role: "Grievance Officer", email: "grievance@vitraya.in", phone: "+91 22 4567 8903", mobile: null },
    { code: "STAR_HEALTH", name: "Suresh Nair", role: "Provider Relationship Manager", email: "suresh.nair@starhealth.in", phone: "+91 44 6600 0000", mobile: "+91 99400 00000" },
    { code: "STAR_HEALTH", name: "Meena Krishnan", role: "Claims Desk", email: "claims@starhealth.in", phone: "+91 44 6600 0001", mobile: null },
    { code: "ICICI_LOMBARD", name: "Vikram Patel", role: "Network Manager", email: "vikram.patel@icicilombard.com", phone: "+91 22 6196 0123", mobile: "+91 98201 23456" },
    { code: "ICICI_LOMBARD", name: "Sonal Desai", role: "Pre-Auth Team Lead", email: "preauth.health@icicilombard.com", phone: "+91 22 6196 0124", mobile: null },
    { code: "HDFC_ERGO", name: "Amit Singh", role: "Hospital Coordinator", email: "amit.singh@hdfcergo.com", phone: "+91 22 6638 4000", mobile: "+91 90000 11111" },
    { code: "HDFC_ERGO", name: "Pooja Rao", role: "Claims Processor", email: "health.claims@hdfcergo.com", phone: "+91 22 6638 4001", mobile: null },
    { code: "NIVA_BUPA", name: "Kavitha Reddy", role: "Provider Services", email: "kavitha.reddy@nivabupa.com", phone: "+91 11 4160 7777", mobile: "+91 98110 00000" },
    { code: "NIVA_BUPA", name: "Ramesh Choudhary", role: "Pre-Auth Specialist", email: "preauth@nivabupa.com", phone: "+91 11 4160 7778", mobile: null },
    { code: "MEDI_ASSIST", name: "Divya Pillai", role: "TPA Coordinator", email: "divya.pillai@mediassist.in", phone: "+91 80 4120 0000", mobile: "+91 99000 12345" },
    { code: "MEDI_ASSIST", name: "Santosh Kumar", role: "Claims Manager", email: "claims@mediassist.in", phone: "+91 80 4120 0001", mobile: null },
    { code: "VIDAL_HEALTH", name: "Arun Menon", role: "Provider Network Head", email: "arun.menon@vidalhealth.com", phone: "+91 80 4618 0000", mobile: "+91 98450 00000" },
    { code: "FHPL", name: "Rashmi Joshi", role: "Network Manager", email: "rashmi.joshi@fhpl.net", phone: "+91 40 6660 0000", mobile: "+91 94400 00000" },
    { code: "MD_INDIA", name: "Naresh Gupta", role: "Claims Head", email: "naresh.gupta@mdindia.com", phone: "+91 80 4090 0000", mobile: "+91 98450 11111" },
    { code: "PARAMOUNT", name: "Seema Shah", role: "Provider Relations", email: "seema.shah@paramounttpa.com", phone: "+91 22 2856 0000", mobile: "+91 93220 00000" },
    { code: "RAKSHA_TPA", name: "Mohit Arora", role: "Hospital Empanelment Manager", email: "mohit.arora@rakshatpa.com", phone: "+91 11 2345 6789", mobile: "+91 96000 00000" },
  ];

  for (const c of contacts) {
    const insurerId = insurers[c.code];
    if (!insurerId) continue;
    await db.contact.create({
      data: {
        insurerId,
        name: c.name,
        role: c.role,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
      },
    });
  }
  console.log(`✅ Contacts: ${contacts.length} seeded`);

  // Commercials
  const commercials = [
    { code: "VITRAYA", category: "Surgery", description: "General Surgery Package Discount", discountPercent: 15, packageRate: null, notes: "Valid for in-network hospitals" },
    { code: "VITRAYA", category: "Cardiac", description: "CABG Package Rate", discountPercent: null, packageRate: 250000, notes: "Inclusive of 7-day ICU stay" },
    { code: "VITRAYA", category: "Orthopedic", description: "Total Knee Replacement Package", discountPercent: 10, packageRate: 180000, notes: "Implant not included" },
    { code: "VITRAYA", category: "Maternity", description: "Normal Delivery Package", discountPercent: null, packageRate: 35000, notes: "Includes 3-day post-delivery stay" },
    { code: "STAR_HEALTH", category: "Surgery", description: "Laparoscopic Surgery Discount", discountPercent: 12, packageRate: null, notes: "All laparoscopic procedures" },
    { code: "STAR_HEALTH", category: "ICU", description: "ICU Day Charge Cap", discountPercent: null, packageRate: 8000, notes: "Per day cap for ventilated patients" },
    { code: "STAR_HEALTH", category: "Maternity", description: "C-Section Package", discountPercent: null, packageRate: 65000, notes: "Includes 5-day stay" },
    { code: "ICICI_LOMBARD", category: "Surgery", description: "Standard Surgical Discount", discountPercent: 10, packageRate: null, notes: "Across all procedures" },
    { code: "ICICI_LOMBARD", category: "Cardiac", description: "Angioplasty (Single Vessel)", discountPercent: null, packageRate: 185000, notes: "Drug-eluting stent not included" },
    { code: "HDFC_ERGO", category: "Orthopedic", description: "Hip Replacement Package", discountPercent: 8, packageRate: 220000, notes: "Bilateral additional 10% off" },
    { code: "HDFC_ERGO", category: "Cancer", description: "Chemotherapy Cycle Discount", discountPercent: 15, packageRate: null, notes: "Oncology department only" },
    { code: "NIVA_BUPA", category: "Renal", description: "Kidney Transplant Package", discountPercent: null, packageRate: 750000, notes: "Includes 21-day monitoring" },
    { code: "NIVA_BUPA", category: "Neurology", description: "Brain Surgery Discount", discountPercent: 12, packageRate: null, notes: "Neurosurgery procedures" },
    { code: "MEDI_ASSIST", category: "Surgery", description: "General Surgical Discount", discountPercent: 10, packageRate: null, notes: "Standard empanelment terms" },
    { code: "VIDAL_HEALTH", category: "Surgery", description: "Surgical Package Discount", discountPercent: 8, packageRate: null, notes: "All network facilities" },
    { code: "FHPL", category: "Diagnostics", description: "Lab & Imaging Discount", discountPercent: 20, packageRate: null, notes: "MRI/CT/PET scans" },
    { code: "MD_INDIA", category: "Maternity", description: "Normal Delivery Rate", discountPercent: null, packageRate: 30000, notes: "Tier 2 city hospitals" },
    { code: "PARAMOUNT", category: "Surgery", description: "Paramount Standard Discount", discountPercent: 10, packageRate: null, notes: "All eligible procedures" },
    { code: "RAKSHA_TPA", category: "Cardiac", description: "Open Heart Surgery Package", discountPercent: null, packageRate: 320000, notes: "Includes 10-day ICU" },
  ];

  for (const c of commercials) {
    const insurerId = insurers[c.code];
    if (!insurerId) continue;
    await db.commercial.create({
      data: {
        insurerId,
        category: c.category,
        description: c.description,
        discountPercent: c.discountPercent,
        packageRate: c.packageRate,
        notes: c.notes,
      },
    });
  }
  console.log(`✅ Commercials: ${commercials.length} seeded`);

  // Claims stats
  const claimsData = [
    { code: "VITRAYA",       pending: 28, approved: 142, queries: 12, rejected: 8,  todaysClaims: 15, monthlyClaims: 190, alReceived: 135, enhancementPending: 9,  dischargePending: 11, paymentReceived: 128, totalAmountApproved: 4250000, totalAmountReceived: 3980000, totalAmountDeducted: 270000, totalCasesProcessed: 190, totalApprovedCases: 142, totalDeniedCases: 8  },
    { code: "STAR_HEALTH",   pending: 45, approved: 312, queries: 23, rejected: 18, todaysClaims: 28, monthlyClaims: 398, alReceived: 298, enhancementPending: 17, dischargePending: 22, paymentReceived: 284, totalAmountApproved: 9870000, totalAmountReceived: 9200000, totalAmountDeducted: 670000, totalCasesProcessed: 398, totalApprovedCases: 312, totalDeniedCases: 18 },
    { code: "ICICI_LOMBARD", pending: 67, approved: 289, queries: 34, rejected: 21, todaysClaims: 32, monthlyClaims: 411, alReceived: 275, enhancementPending: 24, dischargePending: 31, paymentReceived: 261, totalAmountApproved: 8640000, totalAmountReceived: 8100000, totalAmountDeducted: 540000, totalCasesProcessed: 411, totalApprovedCases: 289, totalDeniedCases: 21 },
    { code: "HDFC_ERGO",     pending: 33, approved: 198, queries: 17, rejected: 11, todaysClaims: 18, monthlyClaims: 259, alReceived: 188, enhancementPending: 11, dischargePending: 15, paymentReceived: 179, totalAmountApproved: 5920000, totalAmountReceived: 5540000, totalAmountDeducted: 380000, totalCasesProcessed: 259, totalApprovedCases: 198, totalDeniedCases: 11 },
    { code: "NIVA_BUPA",     pending: 52, approved: 234, queries: 28, rejected: 16, todaysClaims: 22, monthlyClaims: 330, alReceived: 222, enhancementPending: 18, dischargePending: 24, paymentReceived: 210, totalAmountApproved: 7010000, totalAmountReceived: 6550000, totalAmountDeducted: 460000, totalCasesProcessed: 330, totalApprovedCases: 234, totalDeniedCases: 16 },
    { code: "MEDI_ASSIST",   pending: 41, approved: 187, queries: 19, rejected: 13, todaysClaims: 17, monthlyClaims: 260, alReceived: 178, enhancementPending: 14, dischargePending: 18, paymentReceived: 168, totalAmountApproved: 5580000, totalAmountReceived: 5210000, totalAmountDeducted: 370000, totalCasesProcessed: 260, totalApprovedCases: 187, totalDeniedCases: 13 },
    { code: "VIDAL_HEALTH",  pending: 22, approved: 134, queries: 11, rejected: 7,  todaysClaims: 12, monthlyClaims: 174, alReceived: 127, enhancementPending: 8,  dischargePending: 10, paymentReceived: 120, totalAmountApproved: 3980000, totalAmountReceived: 3720000, totalAmountDeducted: 260000, totalCasesProcessed: 174, totalApprovedCases: 134, totalDeniedCases: 7  },
    { code: "FHPL",          pending: 18, approved: 112, queries: 9,  rejected: 5,  todaysClaims: 10, monthlyClaims: 144, alReceived: 106, enhancementPending: 6,  dischargePending: 8,  paymentReceived: 100, totalAmountApproved: 3320000, totalAmountReceived: 3100000, totalAmountDeducted: 220000, totalCasesProcessed: 144, totalApprovedCases: 112, totalDeniedCases: 5  },
    { code: "MD_INDIA",      pending: 29, approved: 156, queries: 14, rejected: 9,  todaysClaims: 14, monthlyClaims: 208, alReceived: 148, enhancementPending: 10, dischargePending: 13, paymentReceived: 140, totalAmountApproved: 4670000, totalAmountReceived: 4370000, totalAmountDeducted: 300000, totalCasesProcessed: 208, totalApprovedCases: 156, totalDeniedCases: 9  },
    { code: "PARAMOUNT",     pending: 37, approved: 175, queries: 21, rejected: 14, todaysClaims: 16, monthlyClaims: 247, alReceived: 166, enhancementPending: 13, dischargePending: 16, paymentReceived: 157, totalAmountApproved: 5230000, totalAmountReceived: 4890000, totalAmountDeducted: 340000, totalCasesProcessed: 247, totalApprovedCases: 175, totalDeniedCases: 14 },
    { code: "RAKSHA_TPA",    pending: 24, approved: 128, queries: 13, rejected: 8,  todaysClaims: 11, monthlyClaims: 173, alReceived: 121, enhancementPending: 8,  dischargePending: 11, paymentReceived: 114, totalAmountApproved: 3840000, totalAmountReceived: 3590000, totalAmountDeducted: 250000, totalCasesProcessed: 173, totalApprovedCases: 128, totalDeniedCases: 8  },
  ];

  for (const { code, ...stats } of claimsData) {
    const insurerId = insurers[code];
    if (!insurerId) continue;
    await db.claimsStats.upsert({
      where: { insurerId },
      update: { ...stats },
      create: { insurerId, ...stats },
    });
  }
  console.log(`✅ Claims stats: ${claimsData.length} seeded`);

  console.log("\n🎉 Database seeded successfully!");
  console.log("   Admin credentials: admin / admin123");
  console.log("   User credentials:  user / user123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
