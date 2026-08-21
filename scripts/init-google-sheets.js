const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;

const SHEET_HEADERS = {
  Registrations: [
    "Registration ID",
    "Registration Number",
    "Event Title",
    "Full Name",
    "VIT Reg Number",
    "Branch",
    "Personal Email",
    "College Email",
    "Phone Number",
    "Registration Status",
    "Submitted At (IST)",
    "QR Pass Token",
    "Registration Source"
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
    "Reviewed At (IST)"
  ],
  Attendance: [
    "Entry / Check-in ID",
    "Student Name",
    "VIT Registration Number",
    "College Email",
    "Time of Entry (IST)",
    "Event Title",
    "Registration Number",
    "Branch",
    "Status",
    "Is Override",
    "Override Reason",
    "Scanned By"
  ],
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
    "Registration Source"
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
    "Created At (IST)"
  ],
  Members: [
    "Member ID",
    "Full Name",
    "Team",
    "Role",
    "Position",
    "LinkedIn URL",
    "Status",
    "Created At (IST)"
  ],
  "Event Winners": [
    "Winner ID",
    "Event Name",
    "Position",
    "Team Name",
    "Project Title",
    "Members",
    "Prize Award",
    "Event Date",
    "GitHub URL",
    "Demo URL"
  ],
  Branches: [
    "Branch ID",
    "Branch Name",
    "Code",
    "Display Order",
    "Is Active"
  ],
  "Audit Logs": [
    "Log ID",
    "Actor ID",
    "Actor Role",
    "Action",
    "Target Type",
    "Target ID",
    "Reason",
    "Timestamp (IST)",
    "Metadata"
  ],
  "Email Logs": [
    "Log ID",
    "Recipient Email",
    "Email Type",
    "Subject",
    "Status",
    "Error Message",
    "Sender ID",
    "Sender Role",
    "Sent At (IST)"
  ],
  "Deleted Registrations": [
    "Archival ID",
    "Registration ID",
    "Registration Number",
    "Student Name",
    "VIT Reg Number",
    "College Email",
    "Personal Email",
    "Branch",
    "Event Title",
    "Status Before Deletion",
    "Deleted By Name",
    "Deleted By Role",
    "Deletion Reason",
    "Timestamp (IST)"
  ],
  Failures: [
    "Failure ID",
    "Service",
    "Operation",
    "Error Message",
    "Retry Count",
    "Resolved",
    "Timestamp (IST)",
    "Payload JSON"
  ]
};

async function initSpreadsheet() {
  console.log("Starting Google Sheet initialization...");
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = new Set((meta.data.sheets || []).map(s => s.properties.title));
  const tabNames = Object.keys(SHEET_HEADERS);

  console.log("Current existing tabs in Sheet:", Array.from(existingTabs));

  // Create missing tabs
  const addRequests = tabNames
    .filter(tab => !existingTabs.has(tab))
    .map(tab => ({
      addSheet: { properties: { title: tab } }
    }));

  if (addRequests.length > 0) {
    console.log("Adding tabs:", addRequests.map(r => r.addSheet.properties.title).join(", "));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: addRequests }
    });
  }

  // Populate formatted headers for each tab
  for (const tab of tabNames) {
    console.log(`Writing headers for tab: ${tab}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [SHEET_HEADERS[tab]]
      }
    });
  }

  // Delete tabs not required: 'Teams', 'Projects', 'Achievements'
  const tabsToDelete = ["Teams", "Projects", "Achievements", "Sheet1"];
  for (const tabTitle of tabsToDelete) {
    if (existingTabs.has(tabTitle)) {
      const sheetObj = meta.data.sheets.find(s => s.properties.title === tabTitle);
      if (sheetObj) {
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{ deleteSheet: { sheetId: sheetObj.properties.sheetId } }]
            }
          });
          console.log(`Removed unneeded tab '${tabTitle}'`);
        } catch (delErr) {
          console.log(`Note on ${tabTitle} cleanup:`, delErr.message);
        }
      }
    }
  }

  // --- IMPORT DATA FROM SUPABASE INTO RESPECTIVE TABS ---
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log("\nConnecting to Supabase to import all records into respective sheets...");
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Registrations
    const { data: regs } = await supabase.from("registrations").select("*, events(title)").order("created_at", { ascending: true });
    if (regs && regs.length > 0) {
      console.log(`Importing ${regs.length} Registrations...`);
      const regRows = regs.map(r => [
        r.id,
        r.registration_number || "",
        r.events?.title || r.event_id || "",
        r.full_name || "",
        r.vit_registration_number || "",
        r.branch_name || r.branch || "",
        r.personal_email || "",
        r.college_email || "",
        r.phone_number || "",
        r.registration_status || r.status || "pending",
        r.created_at || "",
        r.qr_token || "",
        r.registration_source || "online"
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Registrations!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: regRows }
      });
    }

    // 2. Payments
    const { data: payments } = await supabase.from("payments").select("*, registrations(registration_number, events(title))").order("created_at", { ascending: true });
    if (payments && payments.length > 0) {
      console.log(`Importing ${payments.length} Payments...`);
      const pmtRows = payments.map(p => [
        p.id,
        p.registrations?.registration_number || "",
        p.registrations?.events?.title || "",
        p.amount || 0,
        p.transaction_id || "",
        p.payment_status || p.status || "pending",
        p.drive_file_id || "",
        p.drive_file_name || "",
        p.rejection_reason || "",
        p.rejection_explanation || "",
        p.reviewed_by || "",
        p.reviewed_at || ""
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Payments!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: pmtRows }
      });
    }

    // 3. Attendance & Check-ins
    const { data: checkins } = await supabase.from("checkins").select("*, registrations(registration_number, full_name, vit_registration_number, college_email, branch_name, events(title))").order("scan_timestamp", { ascending: true });
    if (checkins && checkins.length > 0) {
      console.log(`Importing ${checkins.length} Check-ins and Attendance records...`);
      const attendanceRows = checkins.map(c => [
        c.id,
        c.registrations?.full_name || "",
        c.registrations?.vit_registration_number || "",
        c.registrations?.college_email || "",
        c.scan_timestamp || "",
        c.registrations?.events?.title || "",
        c.registrations?.registration_number || "",
        c.registrations?.branch_name || "",
        c.status || "approved",
        c.is_override ? "YES" : "NO",
        c.override_reason || "",
        c.scanned_by_name || c.scanned_by || ""
      ]);

      const checkinRows = checkins.map(c => [
        c.id,
        c.registrations?.registration_number || "",
        c.registrations?.full_name || "",
        c.registrations?.vit_registration_number || "",
        c.registrations?.college_email || "",
        c.registrations?.branch_name || "",
        c.status || "approved",
        c.is_override ? "YES" : "NO",
        c.override_reason || "",
        c.scanned_by_name || c.scanned_by || "",
        c.scanned_by_role || "",
        c.scan_timestamp || "",
        c.registrations?.registration_source || "online"
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Attendance!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: attendanceRows }
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Check-ins!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: checkinRows }
      });
    }

    // 4. Events
    const { data: events } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (events && events.length > 0) {
      console.log(`Importing ${events.length} Events...`);
      const eventRows = events.map(e => [
        e.id,
        e.title || "",
        e.slug || "",
        e.venue || "",
        e.event_date || "",
        e.registration_fee || 0,
        e.max_capacity || 0,
        e.is_registration_open ? "OPEN" : "CLOSED",
        e.status || "upcoming",
        e.created_at || ""
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Events!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: eventRows }
      });
    }

    // 5. Members
    const { data: members } = await supabase.from("members").select("*, teams(name)").order("name", { ascending: true });
    if (members && members.length > 0) {
      console.log(`Importing ${members.length} Members...`);
      const memberRows = members.map(m => [
        m.id,
        m.name || "",
        m.teams?.name || "",
        m.role || "",
        m.position || "",
        m.linkedin_url || "",
        m.status || "active",
        m.created_at || ""
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Members!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: memberRows }
      });
    }

    // 6. Event Winners
    const { data: winners } = await supabase.from("event_winners").select("*").order("created_at", { ascending: false });
    if (winners && winners.length > 0) {
      console.log(`Importing ${winners.length} Event Winners...`);
      const winnerRows = winners.map(w => [
        w.id,
        w.event_name || "",
        w.position || "",
        w.team_name || "",
        w.project_title || "",
        Array.isArray(w.members) ? w.members.join(", ") : String(w.members || ""),
        w.prize_award || "",
        w.event_date || "",
        w.github_url || "",
        w.demo_url || ""
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Event Winners!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: winnerRows }
      });
    }

    // 7. Branches
    const { data: branches } = await supabase.from("branches").select("*").order("display_order", { ascending: true });
    if (branches && branches.length > 0) {
      console.log(`Importing ${branches.length} Branches...`);
      const branchRows = branches.map(b => [
        b.id,
        b.name || "",
        b.code || "",
        b.display_order || 0,
        b.is_active ? "YES" : "NO"
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Branches!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: branchRows }
      });
    }

    // 8. Audit Logs
    const { data: auditLogs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: true }).limit(500);
    if (auditLogs && auditLogs.length > 0) {
      console.log(`Importing ${auditLogs.length} Audit Logs...`);
      const auditRows = auditLogs.map(l => [
        l.id,
        l.actor_id || "",
        l.actor_role || "",
        l.action || "",
        l.target_type || "",
        l.target_id || "",
        l.reason || "",
        l.created_at || "",
        JSON.stringify(l.metadata || {}).slice(0, 4000)
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Audit Logs!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: auditRows }
      });
    }

    // 9. Email Logs
    const { data: emailLogs } = await supabase.from("email_logs").select("*").order("sent_at", { ascending: true }).limit(500);
    if (emailLogs && emailLogs.length > 0) {
      console.log(`Importing ${emailLogs.length} Email Logs...`);
      const emailRows = emailLogs.map(e => [
        e.id,
        e.recipient_email || "",
        e.email_type || "",
        e.subject || "",
        e.status || "",
        (e.error_message || "").slice(0, 4000),
        e.sender_id || "",
        e.sender_role || "",
        e.sent_at || ""
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Email Logs!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: emailRows }
      });
    }

    // 10. Failures
    const { data: failures } = await supabase.from("sync_failures").select("*").order("created_at", { ascending: true });
    if (failures && failures.length > 0) {
      console.log(`Importing ${failures.length} Failures...`);
      const failRows = failures.map(f => [
        f.id,
        f.service || "",
        f.operation || "",
        (f.error_message || "").slice(0, 4000),
        f.retry_count || 0,
        f.resolved ? "YES" : "NO",
        f.created_at || "",
        JSON.stringify(f.payload || {}).slice(0, 4000)
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Failures!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: failRows }
      });
    }
  }

  console.log("\n🎉 GOOGLE SHEET INITIALIZATION & DATA IMPORT COMPLETE!");
  console.log("All active operational tabs synchronized with database records:");
  tabNames.forEach(t => console.log(`  ✓ ${t}`));
}

initSpreadsheet().catch(err => {
  console.error("Initialization failed:", err.message);
  process.exit(1);
});
