import { MemberRoleAssignment } from "@/lib/types";

export const TOP_6_ROLES: string[] = [
  "system_council",
  "top_executive",
  "president",
  "vice_president",
  "technical_lead",
  "technical_co_lead",
  "aiml_lead",
  "aiml_co_lead",
  "tech", // legacy alias
];

/**
 * Formats any ISO date or Date object into human-readable IST (Asia/Kolkata) string.
 * Example output: "20 Aug 2026, 10:45 AM IST"
 */
export function formatISTDate(
  dateInput: string | Date | null | undefined,
  includeSeconds = false,
): string {
  if (!dateInput) return "N/A";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "N/A";

    const formatted = d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: true,
    });

    return `${formatted} IST`;
  } catch {
    return "N/A";
  }
}

/**
 * Checks if a role or member roles list belongs to the Top 6 Admin Group.
 */
export function isTop6Admin(
  role: string | null | undefined,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!role) return false;
  const cleanRole = role.toLowerCase();
  if (TOP_6_ROLES.includes(cleanRole)) return true;

  if (roles && Array.isArray(roles)) {
    return roles.some((r) => {
      const p = (r.position || "").toLowerCase();
      const t = (r.team || "").toLowerCase();
      return (
        p === "system_council" ||
        p === "top_executive" ||
        p === "president" ||
        p === "vice_president" ||
        (t === "technical_team" && (p === "lead" || p === "co_lead")) ||
        (t === "aiml_innovation_team" && (p === "lead" || p === "co_lead")) ||
        p === "technical_lead" ||
        p === "technical_co_lead" ||
        p === "aiml_lead" ||
        p === "aiml_co_lead"
      );
    });
  }

  return false;
}

/**
 * Supreme Core Trio / System Council Authority: System Council, President, AI/ML Lead, Technical Lead.
 * These hold supreme authority to appoint and modify Top Executives.
 */
export function isSupremeExecutive(
  role?: string | null,
  roles?: MemberRoleAssignment[],
  email?: string | null,
): boolean {
  if (!role && !email) return false;
  const normalized = (role || "").toLowerCase().trim();
  const normalizedEmail = (email || "").toLowerCase().trim();

  if (
    normalized === "system_council" ||
    normalized === "president" ||
    normalized === "aiml_lead" ||
    normalized === "technical_lead" ||
    normalized === "tech_lead"
  ) {
    return true;
  }

  if (roles && Array.isArray(roles)) {
    const hasSupremeRole = roles.some((r) => {
      const pos = (r.position || "").toLowerCase();
      const tm = (r.team || "").toLowerCase();
      return (
        pos === "system_council" ||
        pos === "president" ||
        pos.includes("aiml lead") ||
        pos.includes("ai/ml lead") ||
        pos.includes("technical lead") ||
        pos.includes("tech lead") ||
        (tm.includes("technical") && pos.includes("lead") && !pos.includes("co_lead") && !pos.includes("co-lead")) ||
        (tm.includes("aiml") && pos.includes("lead") && !pos.includes("co_lead") && !pos.includes("co-lead"))
      );
    });
    if (hasSupremeRole) return true;
  }

  if (
    normalizedEmail.includes("harshvardhan.24bce10511") ||
    normalizedEmail.includes("lakshya.24bce10549") ||
    normalizedEmail.includes("abhinav.24bsa10110")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an account belongs to Top 6 or Panel Executive leadership.
 * These accounts are strictly protected and cannot be disabled or voided.
 */
export function isExecutiveAccount(
  role?: string | null,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  if (isTop6Admin(role, roles)) return true;
  if (
    normalized === "system_council" ||
    normalized === "top_executive" ||
    normalized === "general_secretary" ||
    normalized === "general_secretary_provisional" ||
    normalized === "joint_secretary" ||
    normalized === "assistant_secretary" ||
    normalized === "student_coordinator" ||
    normalized === "panel"
  ) {
    return true;
  }
  if (roles && Array.isArray(roles)) {
    return roles.some((r) => {
      const tm = (r.team || "").toLowerCase();
      return tm === "panel" || tm === "top 6" || tm === "executive";
    });
  }
  return false;
}

/**
 * Returns human-friendly role title (e.g. "System Council", "Top Executive", "Finance Lead", "AIML Lead", "Technical Lead", "President").
 */
export function getHumanReadableRole(
  role: string | null | undefined,
  roles?: MemberRoleAssignment[],
): string {
  if (roles && Array.isArray(roles) && roles.length > 0) {
    const primary = roles[0];
    const team = (primary.team || "").toLowerCase();
    const pos = (primary.position || "").toLowerCase();

    if (pos === "system_council") return "System Council";
    if (pos === "top_executive") return "Top Executive";
    if (pos === "president") return "President";
    if (pos === "vice_president") return "Vice President";
    if (pos === "general_secretary") return "General Secretary";
    if (pos === "joint_secretary") return "Joint Secretary";

    const formatTeam = (t: string) => {
      if (t.includes("aiml")) return "AIML";
      if (t.includes("technical") || t.includes("tech")) return "Technical";
      if (t.includes("finance")) return "Finance";
      if (t.includes("design")) return "Design";
      if (t.includes("pr") || t.includes("outreach")) return "PR & Outreach";
      if (t.includes("event")) return "Event Management";
      if (t.includes("social")) return "Social Media";
      if (t.includes("content")) return "Content";
      if (t.includes("human_resources") || t.includes("hr")) return "HR";
      return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const formatPos = (p: string) => {
      if (p === "lead") return "Lead";
      if (p === "co_lead") return "Co-Lead";
      if (p === "core_member") return "Core Member";
      return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return `${formatTeam(team)} ${formatPos(pos)}`;
  }

  if (!role) return "Staff Member";
  const r = role.toLowerCase();
  if (r === "system_council") return "System Council";
  if (r === "top_executive") return "Top Executive";
  if (r === "tech" || r === "technical_lead") return "Technical Lead";
  if (r === "technical_co_lead") return "Technical Co-Lead";
  if (r === "aiml_lead") return "AIML Lead";
  if (r === "aiml_co_lead") return "AIML Co-Lead";
  if (r === "finance") return "Finance Lead";
  if (r === "president") return "President";
  if (r === "vice_president") return "Vice President";
  if (r === "volunteer") return "Operations Volunteer";

  return r
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Master mapping of official club email addresses to allotted student names.
 */
export const OFFICIAL_ROSTER_NAMES: Record<string, string> = {
  // ── Executive Panel (8) ──
  "president@genai.community": "Harshvardhan Om",
  "vice.president@genai.community": "Akshita Singh",
  "general.secretary@genai.community": "Aditya Mishra",
  "gen.sec.provisional@genai.community": "Anuj Srivastava",
  "joint.secretary@genai.community": "Anvi Vajpayee",
  "assistant.secretary@genai.community": "Archita Shukla",
  "student.coord.001@genai.community": "Ishani Verma",
  "student.coord.002@genai.community": "Prince Agrawal",

  // ── AI/ML & Innovation Team (6) ──
  "aiml.lead@genai.community": "Lakshya Kant",
  "aiml.co.lead@genai.community": "Aaditya Agarwal",
  "aiml.coremember.001@genai.community": "Rachit Singh",
  "aiml.coremember.002@genai.community": "Suhani Boxi",
  "aiml.coremember.003@genai.community": "Sargam Ghagre",
  "aiml.coremember.004@genai.community": "Aditya Verma",

  // ── Technical Team (7) ──
  "tech.lead@genai.community": "Abhinav Kumar",
  "tech.co.lead@genai.community": "Swetalina Sarangi",
  "tech.coremember.001@genai.community": "Anushka Bhatnagar",
  "tech.coremember.002@genai.community": "Rishab jain",
  "tech.coremember.003@genai.community": "Aaditi Shrivastava",
  "tech.coremember.004@genai.community": "Nitin Sharma",
  "tech.coremember.005@genai.community": "Nivedita Jain",

  // ── Design Team (3) ──
  "design.lead@genai.community": "Agrim Mathur",
  "design.co.lead@genai.community": "Kushagra Nigam",
  "design.coremember.001@genai.community": "Ameeshi",

  // ── Event Management Team (4) ──
  "event.lead@genai.community": "Priyansh Upadhyay",
  "event.co.lead@genai.community": "Anya Singh",
  "event.coremember.001@genai.community": "Shikha Singh",
  "event.coremember.002@genai.community": "Shaurya Tyagi",

  // ── HR Team (4) ──
  "hr.lead@genai.community": "Amritanshu Gupta",
  "hr.co.lead@genai.community": "Srishti Manav",
  "hr.coremember.001@genai.community": "Nilansh Chauhan",
  "hr.coremember.002@genai.community": "Aashka Swaroop",

  // ── PR & Outreach Team (7) ──
  "pr.lead@genai.community": "Shashwat Mishra",
  "pr.co.lead@genai.community": "Drishti Pandey",
  "pr.coremember.001@genai.community": "Debasmita Ghosh",
  "pr.coremember.002@genai.community": "Palak Priya",
  "pr.coremember.003@genai.community": "Saanvi Mittal",
  "pr.coremember.004@genai.community": "Anjali Pandey",
  "pr.coremember.005@genai.community": "Pushkar Banjara",

  // ── Social Media Team (6) ──
  "social.lead@genai.community": "Jharna Gupta",
  "social.co.lead@genai.community": "Sakcham Shaw",
  "social.coremember.001@genai.community": "Arpan Akar",
  "social.coremember.002@genai.community": "Ayesha Raza",
  "social.coremember.003@genai.community": "Sanidhya Raj",
  "social.coremember.004@genai.community": "Priyanshu Sinha",

  // ── Content Team (4) ──
  "content.lead@genai.community": "Muskan Jha",
  "content.co.lead@genai.community": "Muskan Bhatia",
  "content.coremember.001@genai.community": "Kaustubh",
  "content.coremember.002@genai.community": "Arsh Arun",

  // ── Finance Team (2) ──
  "finance.lead@genai.community": "Finance Lead",
  "finance.coremember.001@genai.community": "Finance Core Member",
};

/**
 * Resolves the official student human name from email or profile fields.
 */
export function getMemberAssignedName(
  email?: string | null,
  assignedToName?: string | null,
  fullName?: string | null,
): string {
  const cleanAssigned = (assignedToName || "").trim();
  const cleanFull = (fullName || "").trim();
  const isGeneric = (val: string) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return (
      lower === "admin" ||
      lower === "administrator" ||
      lower === "staff member"
    );
  };

  if (cleanAssigned && !isGeneric(cleanAssigned)) {
    return cleanAssigned;
  }

  if (cleanFull && !isGeneric(cleanFull)) {
    return cleanFull;
  }

  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    if (OFFICIAL_ROSTER_NAMES[cleanEmail]) {
      return OFFICIAL_ROSTER_NAMES[cleanEmail];
    }
  }

  if (cleanAssigned) return cleanAssigned;
  if (cleanFull) return cleanFull;

  if (email) {
    const localPart = email.split("@")[0].replace(/[._-]/g, " ");
    return localPart
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return "Member";
}

/**
 * Normalizes any avatar, banner, or drive image URL into a working proxy/direct CDN URL.
 * Automatically resolves raw Google Drive links (uc?export=view, /file/d/..., open?id=...)
 * into the internal streaming proxy route /api/drive/asset/[fileId].
 */
export function normalizeDriveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Already a local proxy route, data URL, or preview route
  if (
    trimmed.startsWith("/api/drive/asset/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/api/admin/drive/preview/") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  // Extract file ID from google drive URLs:
  // 1. https://drive.google.com/uc?export=view&id=FILE_ID
  // 2. https://drive.google.com/file/d/FILE_ID/view...
  // 3. https://drive.google.com/open?id=FILE_ID
  // 4. https://lh3.googleusercontent.com/d/FILE_ID
  const fileIdMatch =
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);

  if (fileIdMatch && fileIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}=s260`;
  }

  return trimmed;
}

