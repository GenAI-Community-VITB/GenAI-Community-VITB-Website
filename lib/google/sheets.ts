import { google, sheets_v4 } from "googleapis";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatISTDate } from "@/lib/utils/format";

export type SheetTabName =
  | "System Audit Logs"
  | "Email Logs"
  | "System Failure Logs"
  | "Members Database"
  | "Branch Database"
  | "Events Database"
  | "Event Lifecycle Log"
  | "Event Winners"
  | "Registrations"
  | "Payment Management"
  | "Attendance"
  | "Deleted Registrations"
  | "Check-ins"
  | "Events"
  | "Members"
  | "Branches"
  | "Audit Logs"
  | "Payments"
  | "Failures"
  | "User Management Log"
  | "Internal Management Log";

export const SHEET_HEADERS: Record<SheetTabName, string[]> = {
  // ── MASTER WORKBOOK TABS ──
  "System Audit Logs": [
    "Log ID",
    "Timestamp (IST)",
    "User / Actor Email",
    "Role",
    "Action Performed",
    "Module / Target Type",
    "Event ID / Target ID",
    "Status",
    "IP Address",
    "Additional Metadata",
  ],
  "Email Logs": [
    "Email ID",
    "Timestamp (IST)",
    "Recipient Email",
    "Email Type",
    "Event ID",
    "Trigger Source",
    "Status",
    "Failure Reason",
    "Retry Count",
  ],
  "System Failure Logs": [
    "Failure ID",
    "Timestamp (IST)",
    "Module",
    "Error Message",
    "Stack Trace",
    "Severity",
    "User Affected",
    "Event Affected",
    "Resolution Status",
  ],

  // ── USER MANAGEMENT LOG (Website Logs Sheet) ──
  "User Management Log": [
    "Log ID",
    "Timestamp (IST)",
    "Actor Email",
    "Actor Role",
    "Action",
    "Target User Email",
    "Target User Name",
    "Previous Role / Status",
    "New Role / Status",
    "Reason / Notes",
    "IP Address",
  ],

  // ── INTERNAL MANAGEMENT LOG (Website Logs Sheet) ──
  "Internal Management Log": [
    "Log ID",
    "Timestamp (IST)",
    "Actor Email",
    "Actor Role",
    "Action",
    "Module",
    "Record ID",
    "Record Name / Title",
    "Change Summary",
    "Previous Value",
    "New Value",
  ],

  // ── INTERNAL MANAGEMENT TABS ──
  "Members Database": [
    "Member ID",
    "Full Name",
    "Email",
    "Phone",
    "Branch",
    "Year",
    "Role / Position",
    "Joining Date",
    "Active Status",
    "Permissions",
  ],
  "Branch Database": [
    "Branch ID",
    "Branch Name",
    "Code",
    "Display Order",
    "Allowed Status",
    "Created Date",
  ],
  "Events Database": [
    "Event ID",
    "Event Name",
    "Slug",
    "Venue",
    "Event Date (IST)",
    "Registration Deadline (IST)",
    "Status",
    "Registration Fee (INR)",
    "Max Capacity",
    "Registration Open",
    "UPI ID",
    "Description",
    "Created At (IST)",
    "Last Updated (IST)",
  ],

  // ── EVENT LIFECYCLE LOG (Internal Management Sheet) ──
  "Event Lifecycle Log": [
    "Log ID",
    "Timestamp (IST)",
    "Actor Email",
    "Actor Role",
    "Action",
    "Event ID",
    "Event Title",
    "Changed Fields",
    "Previous Values",
    "New Values",
    "Notes",
  ],

  "Event Winners": [
    "Winner ID",
    "Event ID / Event Name",
    "Winner Name",
    "Registration ID",
    "Position",
    "Prize Award",
    "Certificate Status",
    "Project Title",
    "GitHub URL",
    "Demo URL",
  ],

  // ── EVENT OPERATIONS SECTIONS ──
  Registrations: [
    "Registration ID",
    "Name",
    "Email",
    "Phone",
    "College Email",
    "Personal Email",
    "Registration Number",
    "Branch",
    "Year",
    "Section",
    "Payment Status",
    "Approval Status",
    "Registration Timestamp (IST)",
  ],
  "Payment Management": [
    "Transaction ID",
    "Registration ID",
    "Amount (INR)",
    "Screenshot URL / Drive File ID",
    "Payment Status",
    "Approved By",
    "Approval Timestamp (IST)",
    "Rejected Reason",
  ],
  Attendance: [
    "Registration ID",
    "Name",
    "QR Token",
    "Check-in Time (IST)",
    "Volunteer Name",
    "Approval Status",
    "Override Reason",
  ],
  "Deleted Registrations": [
    "Registration ID",
    "Original Data JSON",
    "Deleted By",
    "Deletion Reason",
    "Timestamp (IST)",
    "Restore Status",
  ],

  // ── COMPATIBILITY ALIASES ──
  "Check-ins": [
    "Check-in ID",
    "Registration Number",
    "Student Name",
    "VIT Reg Number",
    "College Email",
    "Branch",
    "Status",
    "Is Override",
    "Override Reason",
    "Scanned By",
    "Scanner Role",
    "Scan Timestamp (IST)",
  ],
  Events: [
    "Event ID",
    "Event Title",
    "Slug",
    "Venue",
    "Event Date (IST)",
    "Registration Fee (INR)",
    "Max Capacity",
    "Registration Status",
    "Status",
    "Created At",
  ],
  Members: [
    "Member ID",
    "Full Name",
    "Team",
    "Role",
    "Position",
    "LinkedIn URL",
    "Status",
    "Created At",
  ],
  Branches: [
    "Branch ID",
    "Branch Name",
    "Code",
    "Display Order",
    "Is Active",
  ],
  "Audit Logs": [
    "Log ID",
    "Actor ID",
    "Actor Role",
    "Action",
    "Target Type",
    "Target ID",
    "Reason",
    "Timestamp",
    "Metadata",
  ],
  Payments: [
    "Payment ID",
    "Registration Number",
    "Event Title",
    "Amount (INR)",
    "Transaction ID",
    "Payment Status",
    "Drive File ID",
    "Drive File Name",
    "Rejection Reason",
    "Rejection Explanation",
    "Reviewed By",
    "Reviewed At",
  ],
  Failures: [
    "Failure ID",
    "Service",
    "Operation",
    "Error Message",
    "Retry Count",
    "Resolved",
    "Timestamp",
    "Payload JSON",
  ],
};

/**
 * Resolves the designated Google Spreadsheet ID for a specific tab
 * based on the 3-Sheet Split Architecture.
 */
export function getTargetSpreadsheetId(tabName: SheetTabName): string {
  const eventsSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_EVENTS ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    "13TTlpAixlRCHHqPrRvN_kkfxf5e6tg0j0Wx8iVsAQZ8";

  const logsSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_LOGS ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    "13C4JzdjnZomejYN2tmQI4STwyMEu6I5Ptc-uH3fDoMc";

  const internalSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_INTERNAL ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    "1QpgJmVj93JO5uxQX4qTweDETyZI3VQDh2qX0JoxDUFk";

  switch (tabName) {
    // ── 1. WEBSITE LOGS & AUDIT SPREADSHEET ──
    case "System Audit Logs":
    case "Audit Logs":
    case "Email Logs":
    case "System Failure Logs":
    case "Failures":
    case "User Management Log":
    case "Internal Management Log":
      return logsSheetId;

    // ── 2. INTERNAL MANAGEMENT SPREADSHEET ──
    case "Members Database":
    case "Members":
    case "Branch Database":
    case "Branches":
    case "Events Database":
    case "Event Lifecycle Log":
    case "Events":
    case "Event Winners":
      return internalSheetId;

    // ── 3. EVENT OPERATIONS SPREADSHEET ──
    case "Registrations":
    case "Payment Management":
    case "Payments":
    case "Attendance":
    case "Check-ins":
    case "Deleted Registrations":
    default:
      return eventsSheetId;
  }
}

/**
 * Module-level singleton cache for the Google Sheets client.
 * Rebuilt only when credentials change; avoids JWT overhead per request.
 */
let _sheetsClientCache: { key: string; client: sheets_v4.Sheets } | null = null;

/**
 * Returns an authenticated Google Sheets v4 client (singleton, cached).
 */
export function getGoogleSheetsClient(): sheets_v4.Sheets | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle various new line encodings in private key
  privateKey = privateKey.replace(/\\n/g, "\n");

  const cacheKey = `${clientEmail}|${privateKey.slice(-8)}`;
  if (_sheetsClientCache && _sheetsClientCache.key === cacheKey) {
    return _sheetsClientCache.client;
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = google.sheets({ version: "v4", auth });
    _sheetsClientCache = { key: cacheKey, client };
    return client;
  } catch (err) {
    console.error("Failed to initialize Google Sheets client:", err);
    return null;
  }
}

/**
 * Initializes all required tabs with formatted headers and syncs existing Supabase data.
 * When purgeAndArchive is requested, appends the latest audit date to the spreadsheet metadata.
 */
export async function initializeAndSyncGoogleSheet(params?: {
  purgeAudits?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  tabsCreated: string[];
  recordsSynced: Record<string, number>;
  spreadsheetUrl?: string;
}> {
  const eventsSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_EVENTS ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    "13TTlpAixlRCHHqPrRvN_kkfxf5e6tg0j0Wx8iVsAQZ8";

  const logsSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_LOGS ||
    "13C4JzdjnZomejYN2tmQI4STwyMEu6I5Ptc-uH3fDoMc";

  const internalSheetId =
    process.env.GOOGLE_SPREADSHEET_ID_INTERNAL ||
    "1QpgJmVj93JO5uxQX4qTweDETyZI3VQDh2qX0JoxDUFk";

  const sheets = getGoogleSheetsClient();

  if (!sheets) {
    return {
      success: false,
      message: "Google Service Account credentials are missing or invalid in environment.",
      tabsCreated: [],
      recordsSynced: {},
    };
  }

  const tabsCreated: string[] = [];
  const recordsSynced: Record<string, number> = {};
  const supabase = createAdminSupabase();
  const istDateStr = formatISTDate(new Date(), true);

  try {
    const sheetsClient = sheets;

    // Helper to ensure tabs and write headers in a specific spreadsheet
    async function setupSpreadsheet(
      sheetId: string,
      titlePrefix: string,
      tabs: SheetTabName[],
    ) {
      const meta = await sheetsClient.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: "sheets.properties.title",
      });

      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              updateSpreadsheetProperties: {
                properties: {
                  title: `${titlePrefix} (Updated ${istDateStr})`,
                },
                fields: "title",
              },
            },
          ],
        },
      }).catch((err) => console.warn(`Title update skipped for ${sheetId}:`, err.message));

      const existingTabs = new Set((meta.data.sheets || []).map((s) => s.properties?.title));
      const missing = tabs.filter((t) => !existingTabs.has(t));

      if (missing.length > 0) {
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: missing.map((tab) => ({
              addSheet: { properties: { title: tab } },
            })),
          },
        });
        tabsCreated.push(...missing);
      }

      for (const tab of tabs) {
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tab}!A1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [SHEET_HEADERS[tab]],
          },
        });
      }
    }

    // ── 1. SYNC SHEET 1: EVENT OPERATIONS & REGISTRATIONS ──
    const eventTabs: SheetTabName[] = [
      "Registrations",
      "Payment Management",
      "Attendance",
      "Deleted Registrations",
    ];
    await setupSpreadsheet(eventsSheetId, "GenAI Community Event Management", eventTabs);

    // Sync Registrations
    const { data: regs } = await supabase
      .from("registrations")
      .select("*, events(title), payments(*)")
      .order("created_at", { ascending: true });

    if (regs && regs.length > 0) {
      const regRows = regs.map((r: any) => [
        r.id,
        r.full_name || "",
        r.personal_email || "",
        r.phone_number || "",
        r.college_email || "",
        r.personal_email || "",
        r.registration_number || "",
        r.branch_name || r.branch || "",
        r.academic_year || r.year || "2024-2028",
        r.section || "N/A",
        r.registration_status || "pending",
        r.registration_status === "verified" ? "APPROVED" : r.registration_status === "rejected" ? "REJECTED" : "PENDING",
        r.created_at ? formatISTDate(r.created_at, true) : "",
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: eventsSheetId,
        range: "Registrations!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: regRows },
      });
      recordsSynced["Registrations"] = regRows.length;

      const paymentRows = [];
      for (const r of regs) {
        const pmts = Array.isArray(r.payments) ? r.payments : r.payments ? [r.payments] : [];
        for (const p of pmts) {
          paymentRows.push([
            p.transaction_id || "N/A",
            r.id,
            p.amount || 200,
            p.drive_file_id ? `/api/admin/drive/preview/${p.drive_file_id}` : p.screenshot_url || "N/A",
            p.payment_status || p.status || "pending",
            p.reviewed_by || "Finance Admin",
            p.reviewed_at ? formatISTDate(p.reviewed_at, true) : "Pending",
            p.rejection_reason || "",
          ]);
        }
      }

      if (paymentRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: eventsSheetId,
          range: "Payment Management!A2",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: paymentRows },
        });
        recordsSynced["Payment Management"] = paymentRows.length;
      }
    }

    // ── 2. SYNC SHEET 2: WEBSITE LOGS & AUDIT ──
    const logTabs: SheetTabName[] = [
      "System Audit Logs",
      "Email Logs",
      "System Failure Logs",
      "User Management Log",
      "Internal Management Log",
    ];
    await setupSpreadsheet(logsSheetId, "GenAI Community Website Logs", logTabs);

    // Sync System Audit Logs
    const { data: audits } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: true });
    if (audits && audits.length > 0) {
      const logRows = audits.map((l: any) => [
        l.id,
        l.created_at ? formatISTDate(l.created_at, true) : "",
        l.actor_email || l.actor_user_id || "System",
        l.actor_role || "tech",
        l.action || "",
        l.target_type || "system",
        l.target_id || "Global",
        "SUCCESS",
        l.ip_address || "Internal",
        JSON.stringify(l.metadata || {}),
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: logsSheetId,
        range: "System Audit Logs!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: logRows },
      });
      recordsSynced["System Audit Logs"] = logRows.length;
    }

    // Sync User Management Log — from audit_logs filtered to user-related actions
    const { data: userAudits } = await supabase
      .from("audit_logs")
      .select("*")
      .in("target_type", ["user_profile", "user", "member_role", "auth"])
      .order("created_at", { ascending: false });
    if (userAudits && userAudits.length > 0) {
      const userLogRows = userAudits.map((l: any) => {
        const prev = l.previous_state || {};
        const next = l.new_state || {};
        return [
          l.id,
          l.created_at ? formatISTDate(l.created_at, true) : "",
          l.actor_email || "System",
          l.actor_role || "admin",
          l.action || "",
          next.email || prev.email || l.target_id || "",
          next.full_name || prev.full_name || "",
          prev.role || prev.status || "",
          next.role || next.status || "",
          l.reason || JSON.stringify(l.metadata || {}),
          l.ip_address || "Internal",
        ];
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: logsSheetId,
        range: "User Management Log!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: userLogRows },
      });
      recordsSynced["User Management Log"] = userLogRows.length;
    }

    // Sync Internal Management Log — teams, projects, achievements, winners
    const { data: internalAudits } = await supabase
      .from("audit_logs")
      .select("*")
      .in("target_type", ["team", "project", "achievement", "event_winner", "member", "event"])
      .order("created_at", { ascending: false });
    if (internalAudits && internalAudits.length > 0) {
      const internalLogRows = internalAudits.map((l: any) => {
        const prev = l.previous_state || {};
        const next = l.new_state || {};
        const changedFields = Object.keys(next).filter(k => JSON.stringify(next[k]) !== JSON.stringify(prev[k]));
        return [
          l.id,
          l.created_at ? formatISTDate(l.created_at, true) : "",
          l.actor_email || "System",
          l.actor_role || "admin",
          l.action || "",
          l.target_type || "",
          l.target_id || "",
          next.name || next.title || prev.name || prev.title || "",
          changedFields.join(", ") || l.action,
          changedFields.length > 0 ? JSON.stringify(Object.fromEntries(changedFields.map(k => [k, prev[k]]))) : "",
          changedFields.length > 0 ? JSON.stringify(Object.fromEntries(changedFields.map(k => [k, next[k]]))) : "",
        ];
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: logsSheetId,
        range: "Internal Management Log!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: internalLogRows },
      });
      recordsSynced["Internal Management Log"] = internalLogRows.length;
    }

    // ── 3. SYNC SHEET 3: INTERNAL MANAGEMENT ──
    const internalTabs: SheetTabName[] = [
      "Members Database",
      "Branch Database",
      "Events Database",
      "Event Lifecycle Log",
      "Event Winners",
    ];
    await setupSpreadsheet(internalSheetId, "GenAI Community Internal Management", internalTabs);

    // Sync Events Database — full event details
    const { data: eventsList } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (eventsList && eventsList.length > 0) {
      const eventRows = eventsList.map((e: any) => [
        e.id,
        e.title || "",
        e.slug || "",
        e.venue || "",
        e.event_date ? formatISTDate(e.event_date) : "N/A",
        e.registration_deadline ? formatISTDate(e.registration_deadline) : "N/A",
        (e.status || "active").toUpperCase(),
        `₹${e.registration_fee || 0}`,
        e.max_capacity || 0,
        e.is_registration_open ? "OPEN" : "CLOSED",
        e.upi_id || "",
        (e.description || "").substring(0, 200),
        e.created_at ? formatISTDate(e.created_at, true) : "",
        e.updated_at ? formatISTDate(e.updated_at, true) : "",
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: internalSheetId,
        range: "Events Database!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: eventRows },
      });
      recordsSynced["Events Database"] = eventRows.length;
    }

    // Sync Event Lifecycle Log — creation, edits, deletions from audit_logs
    const { data: eventAudits } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("target_type", "event")
      .order("created_at", { ascending: false });
    if (eventAudits && eventAudits.length > 0) {
      const lifecycleRows = eventAudits.map((l: any) => {
        const prev = l.previous_state || {};
        const next = l.new_state || {};
        const changedFields = Object.keys(next).filter(k => JSON.stringify(next[k]) !== JSON.stringify(prev[k]));
        return [
          l.id,
          l.created_at ? formatISTDate(l.created_at, true) : "",
          l.actor_email || "System",
          l.actor_role || "admin",
          l.action || "",
          l.target_id || "",
          next.title || prev.title || "",
          changedFields.join(", ") || l.action,
          changedFields.length > 0 ? JSON.stringify(Object.fromEntries(changedFields.map(k => [k, prev[k]]))) : "",
          changedFields.length > 0 ? JSON.stringify(Object.fromEntries(changedFields.map(k => [k, next[k]]))) : "",
          l.reason || "",
        ];
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: internalSheetId,
        range: "Event Lifecycle Log!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: lifecycleRows },
      });
      recordsSynced["Event Lifecycle Log"] = lifecycleRows.length;
    }

    const { data: membersList } = await supabase.from("members").select("*, teams(name)").order("name", { ascending: true });
    if (membersList && membersList.length > 0) {
      const memberRows = membersList.map((m: any) => [
        m.id,
        m.name || "",
        m.email || "member@genai.community",
        m.phone || "N/A",
        m.branch || "B.Tech CSE",
        m.year || "2024-2028",
        `${m.teams?.name || "General"} - ${m.position || m.role || "Core Member"}`,
        m.created_at ? formatISTDate(m.created_at) : "",
        m.status ? m.status.toUpperCase() : "ACTIVE",
        JSON.stringify({ role: m.role, position: m.position }),
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: internalSheetId,
        range: "Members Database!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: memberRows },
      });
      recordsSynced["Members Database"] = memberRows.length;
    }

    const { data: branchList } = await supabase.from("branches").select("*").order("display_order", { ascending: true });
    if (branchList && branchList.length > 0) {
      const branchRows = branchList.map((b: any) => [
        b.id,
        b.name || "",
        b.code || "",
        b.display_order || 0,
        b.is_active ? "ALLOWED" : "DISABLED",
        b.created_at ? formatISTDate(b.created_at) : "",
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: internalSheetId,
        range: "Branch Database!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: branchRows },
      });
      recordsSynced["Branch Database"] = branchRows.length;
    }

    const { data: winList } = await supabase.from("event_winners").select("*").order("created_at", { ascending: false });
    if (winList && winList.length > 0) {
      const winRows = winList.map((w: any) => [
        w.id,
        w.event_name || "",
        w.winner_name || w.team_name || "Winner",
        w.registration_id || "N/A",
        w.position || "1st Place",
        w.prize_award || "",
        "VERIFIED",
        w.project_title || "",
        w.github_url || "",
        w.demo_url || "",
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: internalSheetId,
        range: "Event Winners!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: winRows },
      });
      recordsSynced["Event Winners"] = winRows.length;
    }

    return {
      success: true,
      message: "Successfully initialized and synced all 3 distinct Google Spreadsheets (User Mgmt Log, Internal Log, Event Lifecycle Log included).",
      tabsCreated,
      recordsSynced,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${eventsSheetId}`,
    };
  } catch (err: any) {
    console.error("Error syncing 3-sheet architecture:", err);
    return {
      success: false,
      message: err.message || "Failed to initialize and sync 3 Google Sheets.",
      tabsCreated,
      recordsSynced,
    };
  }
}

const TAB_ALIASES: Record<string, string[]> = {
  "System Failure Logs": ["System Failure Logs", "Failures"],
  "Failures": ["System Failure Logs", "Failures"],
  "System Audit Logs": ["System Audit Logs", "Audit Logs"],
  "Audit Logs": ["System Audit Logs", "Audit Logs"],
  "User Management Log": ["Community User Management Logs", "User Management Log"],
  "Community User Management Logs": ["Community User Management Logs", "User Management Log"],
  "Members Database": ["Members Database", "Members"],
  "Members": ["Members Database", "Members"],
  "Branch Database": ["Branch Database", "Branches"],
  "Branches": ["Branch Database", "Branches"],
  "Events Database": ["Events Database", "Events"],
  "Events": ["Events Database", "Events"],
  "Payments": ["Payments", "Payment Management"],
  "Payment Management": ["Payment Management", "Payments"],
};

/**
 * Ensures the target sheet tab exists and has the correct header row.
 * Resolves existing tab aliases if present.
 */
async function ensureSheetHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: SheetTabName,
): Promise<string> {
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const existingTabs = (meta.data.sheets || []).map((s) => s.properties?.title || "");

    // Check if tab or any alias exists
    const aliases = TAB_ALIASES[tabName] || [tabName];
    const foundTab = aliases.find((alias) => existingTabs.includes(alias));

    if (foundTab) {
      return foundTab;
    }

    // Add sheet tab if not present
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName },
            },
          },
        ],
      },
    });

    // Insert headers
    if (SHEET_HEADERS[tabName]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [SHEET_HEADERS[tabName]],
        },
      });
    }

    return tabName;
  } catch (err) {
    console.error(`Error ensuring sheet headers for ${tabName}:`, err);
    return tabName;
  }
}

/**
 * Bounded write-queue for Google Sheets append operations.
 * Google Sheets API enforces a quota of 100 requests/100 seconds per project.
 * Under 1,000 concurrent events, unlimited parallel appends would blow this quota.
 * This queue caps concurrency at MAX_CONCURRENT_WRITES (4) and serializes the rest.
 */
const MAX_CONCURRENT_WRITES = 4;
let _activeWrites = 0;
type QueuedWrite = () => Promise<void>;
const _writeQueue: QueuedWrite[] = [];

function _drainWriteQueue(): void {
  while (_activeWrites < MAX_CONCURRENT_WRITES && _writeQueue.length > 0) {
    const next = _writeQueue.shift()!;
    _activeWrites++;
    next().finally(() => {
      _activeWrites--;
      _drainWriteQueue();
    });
  }
}

function _enqueueWrite(fn: QueuedWrite): void {
  _writeQueue.push(fn);
  _drainWriteQueue();
}

/**
 * Appends rows to a Google Sheets tab through the bounded write-queue.
 * Non-blocking: returns a Promise that resolves when the write is complete.
 * Failures are logged to Supabase `sync_failures` for retry.
 */
export function appendToGoogleSheet(
  tabName: SheetTabName,
  rows: (string | number | boolean | null | undefined)[][],
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    _enqueueWrite(async () => {
      const spreadsheetId = getTargetSpreadsheetId(tabName);
      const sheets = getGoogleSheetsClient();

      if (!sheets || !spreadsheetId) {
        resolve(false);
        return;
      }

      try {
        const effectiveTabName = await ensureSheetHeaders(sheets, spreadsheetId, tabName);

        const sanitizedRows = rows.map((row) =>
          row.map((val) => (val === null || val === undefined ? "" : String(val))),
        );

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${effectiveTabName}'!A:A`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: sanitizedRows },
        });

        resolve(true);
      } catch (err: any) {
        console.error(`Failed to append to Google Sheet (${tabName}):`, err.message);

        try {
          const supabase = createAdminSupabase();
          await supabase.from("sync_failures").insert({
            service: "google_sheets",
            operation: `append_${tabName}`,
            payload: { tabName, rows },
            error_message: err.message || "Unknown error",
            resolved: false,
          });
        } catch (dbErr) {
          console.error("Failed to log sync failure to database:", dbErr);
        }

        resolve(false);
      }
    });
  });
}

/**
 * Retries all unresolved sync failures from the database.
 */
export async function retrySyncFailures(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = createAdminSupabase();
  const { data: failures, error } = await supabase
    .from("sync_failures")
    .select("*")
    .eq("resolved", false)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !failures) return { attempted: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const failure of failures) {
    if (failure.service === "google_sheets") {
      const { tabName, rows } = failure.payload as {
        tabName: SheetTabName;
        rows: any[][];
      };
      const ok = await appendToGoogleSheet(tabName, rows);
      if (ok) {
        await supabase
          .from("sync_failures")
          .update({ resolved: true, retry_count: failure.retry_count + 1 })
          .eq("id", failure.id);
        succeeded++;
      } else {
        await supabase
          .from("sync_failures")
          .update({ retry_count: failure.retry_count + 1 })
          .eq("id", failure.id);
        failed++;
      }
    }
  }

  return { attempted: failures.length, succeeded, failed };
}

/**
 * Creates a brand-new dedicated Google Spreadsheet for a specific event
 * with complete tabs (Registrations, Payments, Attendance, Check-ins, Stats)
 * before archiving or flushing Supabase data.
 */
export async function exportEventToNewSpreadsheet(eventId: string): Promise<{
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  recordsCount?: number;
  error?: string;
}> {
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: false, error: "Google Service Account is not configured in environment." };
  }

  const supabase = createAdminSupabase();

  // 1. Fetch Event metadata
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventErr || !event) {
    return { success: false, error: "Event not found." };
  }

  try {
    const timestampStr = formatISTDate(new Date(), true);
    const sheetTitle = `[EVENT OPERATIONS] ${event.title} - ${timestampStr}`;

    // 2. Create the new Google Spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetTitle,
        },
        sheets: [
          { properties: { title: "Event Information" } },
          { properties: { title: "Registrations" } },
          { properties: { title: "Payment Management" } },
          { properties: { title: "Attendance" } },
          { properties: { title: "Deleted Registrations" } },
        ],
      },
    });

    const newSpreadsheetId = createRes.data.spreadsheetId;
    const spreadsheetUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`;

    if (!newSpreadsheetId) {
      return { success: false, error: "Failed to obtain new Google Spreadsheet ID." };
    }

    // 3. Fetch all registrations with payments & checkins
    const { data: regs } = await supabase
      .from("registrations")
      .select("*, payments(*)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    const totalRegs = regs?.length || 0;

    const { data: checkins } = await supabase
      .from("checkins")
      .select("*, registrations(registration_number, full_name, vit_registration_number, college_email, branch_name)")
      .eq("event_id", eventId)
      .order("scan_timestamp", { ascending: true });

    const totalAttendance = checkins?.filter((c) => c.status === "approved" || c.is_override)?.length || 0;
    const totalRevenue = (regs || []).reduce((acc: number, r: any) => {
      const p = Array.isArray(r.payments) ? r.payments[0] : r.payments;
      if (p?.payment_status === "verified" || p?.status === "verified") {
        return acc + (Number(p.amount) || Number(event.registration_fee) || 0);
      }
      return acc;
    }, 0);

    // 4. Populate Event Information Section at the very top
    const eventInfoRows = [
      ["=================================================="],
      ["EVENT INFORMATION & OPERATIONAL METRICS"],
      ["=================================================="],
      ["Event Name:", event.title],
      ["Event ID:", event.id],
      ["Event Slug:", event.slug || "N/A"],
      ["Organizer:", "GenAI Community VIT Bhopal"],
      ["Venue:", event.venue || "VIT Bhopal University"],
      ["Event Date (IST):", event.event_date ? formatISTDate(event.event_date) : "N/A"],
      ["Registration Deadline:", event.registration_deadline ? formatISTDate(event.registration_deadline) : "N/A"],
      ["Current Status:", String(event.status || "active").toUpperCase()],
      ["Registration Fee (INR):", `₹${event.registration_fee || 0}`],
      ["Max Capacity:", event.max_capacity || 2000],
      ["Total Registrations:", totalRegs],
      ["Total Attendance:", totalAttendance],
      ["Revenue Generated (INR):", `₹${totalRevenue}`],
      ["Export Generated (IST):", timestampStr],
      ["=================================================="],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId,
      range: "Event Information!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: eventInfoRows },
    });

    // 5. Populate Section 1: REGISTRATIONS
    const regHeaders = SHEET_HEADERS["Registrations"];
    const regRows = (regs || []).map((r: any) => [
      r.id,
      r.full_name || "",
      r.personal_email || "",
      r.phone_number || "",
      r.college_email || "",
      r.personal_email || "",
      r.registration_number || "",
      r.branch_name || r.branch || "",
      r.academic_year || r.year || "2024-2028",
      r.section || "N/A",
      r.registration_status || r.status || "pending",
      r.registration_status === "verified" ? "APPROVED" : r.registration_status === "rejected" ? "REJECTED" : "PENDING",
      r.created_at ? formatISTDate(r.created_at, true) : "",
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId,
      range: "Registrations!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [regHeaders, ...regRows] },
    });

    // 6. Populate Section 2: PAYMENT MANAGEMENT
    const paymentHeaders = SHEET_HEADERS["Payment Management"];
    const paymentRows: any[][] = [];
    for (const r of regs || []) {
      const pmts = Array.isArray(r.payments) ? r.payments : r.payments ? [r.payments] : [];
      for (const p of pmts) {
        paymentRows.push([
          p.transaction_id || "N/A",
          r.id,
          p.amount || event.registration_fee || 0,
          p.drive_file_id ? `/api/admin/drive/preview/${p.drive_file_id}` : p.screenshot_url || "N/A",
          p.payment_status || p.status || "pending",
          p.reviewed_by || "Finance Admin",
          p.reviewed_at ? formatISTDate(p.reviewed_at, true) : "Pending",
          p.rejection_reason || p.rejection_explanation || "",
        ]);
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId,
      range: "Payment Management!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [paymentHeaders, ...paymentRows] },
    });

    // 7. Populate Section 3: ATTENDANCE
    const attendanceHeaders = SHEET_HEADERS["Attendance"];
    const attendanceRows = (checkins || []).map((c: any) => [
      c.registration_id || c.registrations?.id || "",
      c.registrations?.full_name || "",
      c.qr_token || "SECURE_TOKEN",
      c.scan_timestamp ? formatISTDate(c.scan_timestamp, true) : "",
      c.scanned_by_name || c.scanned_by || "Event Volunteer",
      c.status === "approved" || c.is_override ? "APPROVED" : "REJECTED",
      c.override_reason || (c.is_override ? "Tech Override" : ""),
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId,
      range: "Attendance!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [attendanceHeaders, ...attendanceRows] },
    });

    // 8. Populate Section 4: DELETED REGISTRATIONS
    const { data: deletedRegs } = await supabase
      .from("deleted_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    const deletedHeaders = SHEET_HEADERS["Deleted Registrations"];
    const deletedRows = (deletedRegs || []).map((d: any) => [
      d.registration_id || d.id,
      JSON.stringify(d.registration_data || {}),
      d.deleted_by_name || d.deleted_by || "Administrator",
      d.deletion_reason || d.reason || "Administrative Cleanup",
      d.created_at ? formatISTDate(d.created_at, true) : "",
      d.restored_at ? "RESTORED" : "ARCHIVED",
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId,
      range: "Deleted Registrations!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [deletedHeaders, ...deletedRows] },
    });

    return {
      success: true,
      spreadsheetId: newSpreadsheetId,
      spreadsheetUrl,
      recordsCount: totalRegs,
    };
  } catch (err: any) {
    console.error("Error creating new Event Operations Google Spreadsheet:", err);
    return { success: false, error: err.message || "Failed to export event to new Google Spreadsheet." };
  }
}
