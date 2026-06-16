export const kpis = {
  totalLeads: 1284,
  totalLeadsDelta: 12.4,
  activeProjects: 47,
  activeProjectsDelta: 3.2,
  revenueForecast: 2_850_000,
  revenueForecastDelta: 8.7,
  conversionRate: 34.2,
  conversionRateDelta: 2.1,
};

export const pipelineStages = [
  { key: "new", label: "New", count: 42, value: 320_000, color: "oklch(0.65 0.14 230)" },
  { key: "contacted", label: "Contacted", count: 31, value: 410_000, color: "oklch(0.7 0.13 210)" },
  { key: "qualified", label: "Qualified", count: 24, value: 560_000, color: "oklch(0.706 0.181 49.5)" },
  { key: "proposal", label: "Proposal", count: 18, value: 720_000, color: "oklch(0.66 0.2 40)" },
  { key: "negotiation", label: "Negotiation", count: 11, value: 540_000, color: "oklch(0.6 0.19 30)" },
  { key: "won", label: "Won", count: 9, value: 300_000, color: "oklch(0.68 0.16 155)" },
];

export type LeadStatus = string;

export interface Lead {
  id: string;
  company: string;
  contact: string;
  source: string;
  status: LeadStatus;
  owner: string;
  ownerPhoto?: string;
  value: number;
  industry: string;
  updatedAt: string;
  city: string;
  country?: string;
  lat: number;
  lng: number;
  email?: string;
  street?: string;
  probability?: number;
  expectedCloseDate?: string;
  projectId?: string;
}

export const leads: Lead[] = [
  { id: "L-1042", company: "Aramco Digital", contact: "Khalid Al-Otaibi", source: "Referral", status: "negotiation", owner: "hafez Rahim", value: 420_000, industry: "Energy", updatedAt: "2h ago", city: "Cairo", lat: 30.0444, lng: 31.2357, probability: 85, expectedCloseDate: "2026-06-15" },
  { id: "L-1041", company: "Red Sea Global", contact: "Maya Suleiman", source: "Website", status: "proposal_sent", owner: "Nour Khaled", value: 280_000, industry: "Hospitality", updatedAt: "5h ago", city: "Hurghada", lat: 27.2579, lng: 33.8116, probability: 60, expectedCloseDate: "2026-07-01" },
  { id: "L-1040", company: "STC Group", contact: "Faisal Al-Rashed", source: "LinkedIn", status: "qualified", owner: "Omar Tarek", value: 560_000, industry: "Telecom", updatedAt: "1d ago", city: "Alexandria", lat: 31.2001, lng: 29.9187, probability: 40, expectedCloseDate: "2026-08-20" },
  { id: "L-1039", company: "NEOM Logistics", contact: "Sara Al-Harbi", source: "Event", status: "contacted", owner: "Layla Hassan", value: 175_000, industry: "Logistics", updatedAt: "1d ago", city: "Port Said", lat: 31.2653, lng: 32.3019, probability: 20, expectedCloseDate: "2026-06-30" },
  { id: "L-1038", company: "Saudi Electricity Co.", contact: "Abdullah Najjar", source: "Cold Call", status: "new", owner: "hafez Rahim", value: 92_000, industry: "Utilities", updatedAt: "2d ago", city: "Giza", lat: 30.0131, lng: 31.2089, probability: 10, expectedCloseDate: "2026-09-01" },
  { id: "L-1037", company: "Mobily Infra", contact: "Reem Al-Saud", source: "Referral", status: "won", owner: "Omar Tarek", value: 310_000, industry: "Telecom", updatedAt: "3d ago", city: "Cairo", lat: 30.0444, lng: 31.2357, probability: 100, expectedCloseDate: "2026-05-10" },
  { id: "L-1036", company: "Bupa Arabia", contact: "Tariq Mansour", source: "Website", status: "qualified", owner: "Nour Khaled", value: 145_000, industry: "Healthcare", updatedAt: "3d ago", city: "Alexandria", lat: 31.2001, lng: 29.9187, probability: 55, expectedCloseDate: "2026-07-15" },
  { id: "L-1035", company: "Almarai Plants", contact: "Hessa Al-Dosari", source: "Partner", status: "proposal_sent", owner: "Layla Hassan", value: 230_000, industry: "FMCG", updatedAt: "4d ago", city: "Luxor", lat: 25.6872, lng: 32.6396, probability: 75, expectedCloseDate: "2026-06-25" },
];

export const activities = [
  { id: 1, type: "Call", title: "Discovery call — Aramco Digital", time: "09:30", owner: "hafez Rahim", status: "done", presalesTeam: [] },
  { id: 2, type: "Meeting", title: "Site visit — Red Sea Global HQ", time: "11:00", owner: "Nour Khaled", status: "in_progress", presalesTeam: ["Omar Tarek"] },
  { id: 3, type: "Email", title: "Proposal follow-up — STC", time: "13:15", owner: "Omar Tarek", status: "pending", presalesTeam: [] },
  { id: 4, type: "Visit", title: "Technical inspection — NEOM", time: "15:00", owner: "Layla Hassan", status: "pending", presalesTeam: ["Ahmed Kamal", "Omar Tarek"] },
  { id: 5, type: "Call", title: "Renewal — Mobily Infra", time: "16:30", owner: "Omar Tarek", status: "pending", presalesTeam: [] },
];

export const projects = [
  { id: "P-208", name: "CCTV Rollout — Aramco D2", client: "Aramco Digital", progress: 78, budget: 1_200_000, offeredValue: 1_150_000, status: "On Track", team: 12, category: "Security", competitors: ["Securitas"], lastUpdate: "2026-05-20" },
  { id: "P-207", name: "Firefighting Upgrade — Red Sea", client: "Red Sea Global", progress: 42, budget: 860_000, offeredValue: 880_000, status: "On Track", team: 8, category: "Safety", competitors: [], lastUpdate: "2026-05-22" },
  { id: "P-206", name: "Server Infrastructure — STC DC4", client: "STC Group", progress: 65, budget: 2_100_000, offeredValue: 2_050_000, status: "At Risk", team: 18, category: "IT Infrastructure", competitors: ["Huawei", "Cisco"], lastUpdate: "2026-05-18" },
  { id: "P-205", name: "Maintenance Contract — Mobily", client: "Mobily Infra", progress: 91, budget: 540_000, offeredValue: 540_000, status: "On Track", team: 6, category: "Maintenance", competitors: [], lastUpdate: "2026-05-23" },
  { id: "P-204", name: "Logistics Fleet GPS — NEOM", client: "NEOM Logistics", progress: 23, budget: 720_000, offeredValue: 750_000, status: "Delayed", team: 9, category: "Tracking", competitors: ["Garmin"], lastUpdate: "2026-05-15" },
];

export const employees = [
  { id: "E-01", name: "hafez Rahim", role: "Sales Director", department: "Sales", perf: 96, leads: 38, won: 14, avatar: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg", email: "hafez.rahim@integrated-technics.com", phone: "+20 100 111 2233", annualTarget: 5_000_000, achievedTarget: 4_800_000 },
  { id: "E-02", name: "Nour Khaled", role: "Senior Account Manager", department: "Sales", perf: 91, leads: 32, won: 11, avatar: "NK", photo: "https://png.pngtree.com/png-vector/20250301/ourlarge/pngtree-muslim-girl-dressed-in-graceful-traditional-attire-png-image_15678415.png", email: "nour.khaled@integrated-technics.com", phone: "+20 100 222 3344", annualTarget: 3_000_000, achievedTarget: 2_730_000 },
  { id: "E-03", name: "Omar Tarek", role: "Solutions Engineer", department: "Technical", perf: 88, leads: 24, won: 9, avatar: "OT", photo: "https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTEyL3Jhd3BpeGVsX29mZmljZV8yN19yZWFsaXN0aWNfcGhvdG9fb2Zfc21pbGluZ19oYW5kc29tZV95b3VuZ19pbl8xNWExMTE1ZC0xZTBiLTQ4YjAtOGEyNi01ZDE1ZmE3Njg2MzYucG5n.png", email: "omar.tarek@integrated-technics.com", phone: "+20 100 333 4455", annualTarget: 2_000_000, achievedTarget: 1_760_000 },
  { id: "E-04", name: "Layla Hassan", role: "Field Operations", department: "Operations", perf: 84, leads: 19, won: 6, avatar: "LH", photo: "https://e7.pngegg.com/pngimages/394/133/png-clipart-hijab-muslim-islamic-fashion-woman-islam-tube-girl.png", email: "layla.hassan@integrated-technics.com", phone: "+20 100 444 5566", annualTarget: 1_500_000, achievedTarget: 1_260_000 },
  { id: "E-05", name: "Yusuf Saleh", role: "HR Specialist", department: "HR", perf: 79, leads: 0, won: 0, avatar: "YS", photo: "https://png.pngtree.com/thumb_back/fh260/background/20250327/pngtree-portrait-of-a-happy-indian-man-wearing-an-orange-sweatshirt-standing-image_17144577.jpg", email: "yusuf.saleh@integrated-technics.com", phone: "+20 100 555 6677", annualTarget: 0, achievedTarget: 0 },
  { id: "E-06", name: "Aisha Mahmoud", role: "Project Manager", department: "Projects", perf: 93, leads: 12, won: 7, avatar: "AM", photo: "https://png.pngtree.com/png-vector/20250301/ourlarge/pngtree-muslim-girl-dressed-in-graceful-traditional-attire-png-image_15678415.png", email: "aisha.mahmoud@integrated-technics.com", phone: "+20 100 666 7788", annualTarget: 2_500_000, achievedTarget: 2_325_000 },
];

export const attendanceToday = {
  present: 142,
  late: 7,
  absent: 4,
  total: 153,
  records: [
    { id: 1, name: "hafez Rahim", in: "07:52", out: "—", status: "present", hours: "—", location: "Riyadh HQ" },
    { id: 2, name: "Nour Khaled", in: "08:04", out: "—", status: "present", hours: "—", location: "Riyadh HQ" },
    { id: 3, name: "Omar Tarek", in: "08:23", out: "—", status: "late", hours: "—", location: "Site — Aramco D2" },
    { id: 4, name: "Layla Hassan", in: "07:48", out: "—", status: "present", hours: "—", location: "Field — NEOM" },
    { id: 5, name: "Yusuf Saleh", in: "—", out: "—", status: "absent", hours: "—", location: "—" },
    { id: 6, name: "Aisha Mahmoud", in: "08:01", out: "—", status: "present", hours: "—", location: "Riyadh HQ" },
  ],
};

export type QuotationStatus = "draft" | "pending_approval" | "sent" | "negotiating" | "accepted" | "rejected";
export interface QuotationItem {
  id: string;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  qty: number;
  unitPrice: number;
  total: number;
}
export interface Quotation {
  id: string;
  uuid?: string;
  code?: string;
  leadId: string;
  projectId?: string;
  clientId?: string;
  client: string;
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  submissionDate: string;
  validUntil?: string;
  currency?: string;
  value: number;
  status: QuotationStatus;
  revisions: number;
  owner: string;
  ownerId?: string;
  ownerPhoto?: string;
  createdById?: string;
  approvedAt?: string;
  approvedByName?: string;
  createdAt?: string;
  updatedAt?: string;
  feedback?: string;
  items?: QuotationItem[];
}


export const quotations: Quotation[] = [
  { id: "Q-2026-001", leadId: "L-1042", client: "Aramco Digital", submissionDate: "2026-05-10", value: 420_000, status: "negotiating", revisions: 2, owner: "hafez Rahim", feedback: "Requested discount on hardware." },
  { id: "Q-2026-002", leadId: "L-1041", client: "Red Sea Global", submissionDate: "2026-05-18", value: 280_000, status: "sent", revisions: 0, owner: "Nour Khaled", feedback: "Awaiting technical review." },
  { id: "Q-2026-003", leadId: "L-1035", client: "Almarai Plants", submissionDate: "2026-05-20", value: 230_000, status: "pending_approval", revisions: 1, owner: "Layla Hassan" },
  { id: "Q-2026-004", leadId: "L-1037", client: "Mobily Infra", submissionDate: "2026-04-15", value: 310_000, status: "accepted", revisions: 3, owner: "Omar Tarek", feedback: "Approved by procurement." },
];

export const trendSeries = [38, 42, 51, 47, 58, 64, 71, 68, 76, 82, 79, 91];

export function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}