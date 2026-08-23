const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
}

const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const expectedTabs = {
  // Website Logs Sheet / Master Logs
  "System Audit Logs": [
    "Log ID", "Timestamp (IST)", "User / Actor Email", "Role", "Action Performed",
    "Module / Target Type", "Event ID / Target ID", "Status", "IP Address", "Additional Metadata"
  ],
  "Email Logs": [
    "Email ID", "Timestamp (IST)", "Recipient Email", "Email Type", "Event ID",
    "Trigger Source", "Status", "Failure Reason", "Retry Count"
  ],
  "System Failure Logs": [
    "Failure ID", "Timestamp (IST)", "Module", "Error Message", "Stack Trace",
    "Severity", "User Affected", "Event Affected", "Resolution Status"
  ],
  "User Management Log": [
    "Log ID", "Timestamp (IST)", "Actor Email", "Actor Role", "Action",
    "Target User Email", "Target User Name", "Previous Role / Status", "New Role / Status",
    "Reason / Notes", "IP Address"
  ],
  "Internal Management Log": [
    "Log ID", "Timestamp (IST)", "Actor Email", "Actor Role", "Action",
    "Module", "Record ID", "Record Name / Title", "Change Summary", "Previous Value", "New Value"
  ],

  // Event Operations
  "Registrations": [
    "Registration ID", "Registration Number", "Event Title", "Full Name", "VIT Reg Number",
    "Branch", "Personal Email", "College Email", "Phone Number", "Registration Status",
    "Submitted At (IST)", "QR Pass Token", "Registration Source"
  ],
  "Payments": [
    "Payment ID", "Registration Number", "Event Title", "Amount (INR)", "Transaction ID",
    "Payment Status", "Drive File ID", "Drive File Name", "Rejection Reason",
    "Rejection Explanation", "Reviewed By", "Reviewed At (IST)"
  ],
  "Payment Management": [
    "Payment ID", "Registration Number", "Event Title", "Amount (INR)", "Transaction ID",
    "Payment Status", "Drive File ID", "Payment Screenshot URL", "Rejection Reason",
    "Rejection Explanation", "Reviewed By", "Reviewed At (IST)"
  ],
  "Attendance": [
    "Entry / Check-in ID", "Student Name", "VIT Registration Number", "College Email",
    "Time of Entry (IST)", "Event Title", "Registration Number", "Branch",
    "Status", "Is Override", "Override Reason", "Scanned By"
  ],
  "Check-ins": [
    "Check-in ID", "Registration Number", "Student Name", "VIT Reg Number",
    "College Email", "Branch", "Status", "Is Override", "Override Reason",
    "Scanned By", "Scanner Role", "Scan Timestamp (IST)", "Registration Source"
  ],
  "Deleted Registrations": [
    "Deletion ID", "Registration Number", "Event Title", "Full Name", "VIT Reg Number",
    "College Email", "Phone Number", "Deleted By (Admin Email)", "Deletion Timestamp (IST)",
    "Reason For Deletion", "Refund Status", "Original Submission Time (IST)"
  ],

  // Internal Management
  "Members Database": [
    "Member ID", "Full Name", "Email", "Phone", "Branch", "Year",
    "Role / Position", "Joining Date", "Active Status", "Permissions"
  ],
  "Branch Database": [
    "Branch ID", "Branch Name", "Code", "Display Order", "Allowed Status", "Created Date"
  ],
  "Events Database": [
    "Event ID", "Event Name", "Slug", "Venue", "Date & Time (IST)",
    "Registration Fee (INR)", "Max Seats", "Registered Count", "Status", "Created At (IST)"
  ],
  "Event Lifecycle Log": [
    "Log ID", "Timestamp (IST)", "Event ID", "Event Title", "Previous State",
    "New State", "Actor Email", "Actor Role", "Reason"
  ],
  "Event Winners": [
    "Winner ID", "Event ID", "Event Title", "Position", "Team Name",
    "Leader Name", "Leader Reg No", "Leader Email", "Team Members", "Prize Details"
  ]
};

async function auditSheets() {
  console.log("\n================================================================================");
  console.log(" 🔍 COMPREHENSIVE GOOGLE SHEETS LIVE ARCHITECTURE & TABS AUDIT");
  console.log("================================================================================\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheets = [
    { label: "Master / Default", id: env.GOOGLE_SPREADSHEET_ID },
    { label: "Events Operations", id: env.GOOGLE_SPREADSHEET_ID_EVENTS },
    { label: "Website Logs", id: env.GOOGLE_SPREADSHEET_ID_LOGS },
    { label: "Internal Management", id: env.GOOGLE_SPREADSHEET_ID_INTERNAL }
  ];

  const uniqueSheets = new Map();
  spreadsheets.forEach(s => {
    if (s.id && !uniqueSheets.has(s.id)) {
      uniqueSheets.set(s.id, s.label);
    }
  });

  for (const [sheetId, label] of uniqueSheets.entries()) {
    console.log(`\n── [${label}] Spreadsheet (ID: ${sheetId}) ────────────────────`);
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const title = meta.data.properties.title;
      const existingTabs = meta.data.sheets.map(s => s.properties.title);

      console.log(` Title : "${title}"`);
      console.log(` Existing Tabs (${existingTabs.length}):`, existingTabs.join(", "));

      // Check which expected tabs exist and test append
      for (const [tabName, headers] of Object.entries(expectedTabs)) {
        const tabExists = existingTabs.includes(tabName);
        if (tabExists) {
          // Test read headers
          try {
            const rangeRes = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'${tabName}'!A1:Z1`
            });
            const rowHeaders = rangeRes.data.values ? rangeRes.data.values[0] : [];
            const hasHeaders = rowHeaders && rowHeaders.length > 0;
            console.log(`   ✓ Tab [${tabName.padEnd(24)}] : Present (${hasHeaders ? rowHeaders.length + ' headers' : 'Empty tab'})`);
          } catch (readErr) {
            console.log(`   ⚠ Tab [${tabName.padEnd(24)}] : Read warning: ${readErr.message}`);
          }
        }
      }
    } catch (sheetErr) {
      console.error(`   ✗ Error accessing sheet ${sheetId}:`, sheetErr.message);
    }
  }

  console.log("\n================================================================================");
  console.log(" Live Sheet Audit Completed.");
  console.log("================================================================================\n");
}

auditSheets().catch(err => {
  console.error("Audit error:", err);
});
