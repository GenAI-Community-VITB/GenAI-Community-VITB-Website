const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// Load .env.local
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

const eventsSheetId = env.GOOGLE_SPREADSHEET_ID_EVENTS || env.GOOGLE_SPREADSHEET_ID || "13TTlpAixlRCHHqPrRvN_kkfxf5e6tg0j0Wx8iVsAQZ8";
const logsSheetId = env.GOOGLE_SPREADSHEET_ID_LOGS || env.GOOGLE_SPREADSHEET_ID || "13C4JzdjnZomejYN2tmQI4STwyMEu6I5Ptc-uH3fDoMc";
const internalSheetId = env.GOOGLE_SPREADSHEET_ID_INTERNAL || env.GOOGLE_SPREADSHEET_ID || "1QpgJmVj93JO5uxQX4qTweDETyZI3VQDh2qX0JoxDUFk";

function getTargetSpreadsheetId(tabName) {
  switch (tabName) {
    case "System Audit Logs":
    case "Audit Logs":
    case "Email Logs":
    case "System Failure Logs":
    case "Failures":
    case "User Management Log":
    case "Community User Management Logs":
    case "Internal Management Log":
      return logsSheetId;

    case "Members Database":
    case "Members":
    case "Branch Database":
    case "Branches":
    case "Events Database":
    case "Event Lifecycle Log":
    case "Events":
    case "Event Winners":
      return internalSheetId;

    default:
      return eventsSheetId;
  }
}

async function testAllLoggers() {
  console.log("\n================================================================================");
  console.log(" 🧪 TESTING LIVE WRITE & LOGGING TO ALL GOOGLE SHEET TABS");
  console.log("================================================================================\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });
  const testTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const testSuites = [
    // ── 1. WEBSITE LOGS SPREADSHEET ──
    {
      group: "Website Logs",
      tab: "System Audit Logs",
      row: ["test_audit_" + Date.now(), testTimestamp, "test.admin@genai.community", "superadmin", "TEST_AUDIT_ACTION", "system", "SYSTEM_TARGET_01", "SUCCESS", "127.0.0.1", "{\"verified\":true}"]
    },
    {
      group: "Website Logs",
      tab: "Email Logs",
      row: ["test_email_" + Date.now(), testTimestamp, "test.recipient@vitbhopal.ac.in", "QR_PASS", "EVENT_TEST_01", "system_test", "DELIVERED", "None", "0"]
    },
    {
      group: "Website Logs",
      tab: "System Failure Logs",
      row: ["test_fail_" + Date.now(), testTimestamp, "google_sheets_probe", "Test error verification probe", "No stack trace", "LOW", "None", "None", "RESOLVED_AUTO"]
    },

    // ── 2. EVENT OPERATIONS SPREADSHEET ──
    {
      group: "Event Operations",
      tab: "Registrations",
      row: ["test_reg_" + Date.now(), "REG-2026-TEST", "GenAI AI Summit 2026", "Test User", "24BCE9999", "CSE-AIML", "test@gmail.com", "test@vitbhopal.ac.in", "9876543210", "verified", testTimestamp, "TOKEN-TEST-QR", "web"]
    },
    {
      group: "Event Operations",
      tab: "Payments",
      row: ["test_pmt_" + Date.now(), "REG-2026-TEST", "GenAI AI Summit 2026", 199, "UTR9999988888", "verified", "test_file_id", "receipt.png", "", "", "Lead Admin", testTimestamp]
    },
    {
      group: "Event Operations",
      tab: "Attendance",
      row: ["test_att_" + Date.now(), "Test User", "24BCE9999", "test@vitbhopal.ac.in", testTimestamp, "GenAI AI Summit 2026", "REG-2026-TEST", "CSE-AIML", "approved", "false", "", "Event Volunteer"]
    },
    {
      group: "Event Operations",
      tab: "Check-ins",
      row: ["test_chk_" + Date.now(), "REG-2026-TEST", "Test User", "24BCE9999", "test@vitbhopal.ac.in", "CSE-AIML", "approved", "false", "", "Volunteer 01", "volunteer", testTimestamp, "scanner"]
    },
    {
      group: "Event Operations",
      tab: "Deleted Registrations",
      row: ["test_del_" + Date.now(), "REG-2026-TEST", "GenAI AI Summit 2026", "Test User", "24BCE9999", "test@vitbhopal.ac.in", "9876543210", "admin@genai.community", testTimestamp, "Test Cleanup", "REFUNDED", testTimestamp]
    },

    // ── 3. INTERNAL MANAGEMENT SPREADSHEET ──
    {
      group: "Internal Management",
      tab: "Event Lifecycle Log",
      row: ["test_life_" + Date.now(), testTimestamp, "EVENT_TEST_01", "GenAI Launch", "DRAFT", "PUBLISHED", "lead@genai.community", "event_head", "State changed to live"]
    },
    {
      group: "Internal Management",
      tab: "Event Winners",
      row: ["test_win_" + Date.now(), "EVENT_TEST_01", "GenAI Launch", "1st Place", "Team Neural", "Winner Leader", "24BCE1234", "leader@vitbhopal.ac.in", "Member 1, Member 2", "₹10,000 Cash Prize + Certificate"]
    },
    {
      group: "Internal Management",
      tab: "Members Database",
      row: ["test_mem_" + Date.now(), "Test Core Member", "core.member@vitbhopal.ac.in", "9998887776", "CSE-AIML", "2024-2028", "Core Committee", testTimestamp, "ACTIVE", "{\"role\":\"core\"}"]
    },
    {
      group: "Internal Management",
      tab: "Branch Database",
      row: ["test_br_" + Date.now(), "Test Computer Science", "CSE-TEST", 99, "ALLOWED", testTimestamp]
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const item of testSuites) {
    const targetSheetId = getTargetSpreadsheetId(item.tab);
    const start = Date.now();
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: targetSheetId,
        range: `'${item.tab}'!A:A`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [item.row]
        }
      });
      const lat = Date.now() - start;
      console.log(` [✓ PASS] [${item.group.padEnd(20)}] Tab: ${item.tab.padEnd(24)} (${lat}ms)`);
      passCount++;
    } catch (err) {
      console.log(` [✗ FAIL] [${item.group.padEnd(20)}] Tab: ${item.tab.padEnd(24)} -> Error: ${err.message}`);
      failCount++;
    }
  }

  console.log("\n================================================================================");
  console.log(` 📊 RESULTS: ${passCount}/${testSuites.length} Tabs Verified Successfully | ${failCount} Failures`);
  console.log(` 🎯 STATUS : ${failCount === 0 ? "ALL SPREADSHEETS & LOGGERS OPERATIONAL ✅" : "FIXES NEEDED ❌"}`);
  console.log("================================================================================\n");
}

testAllLoggers().catch(err => {
  console.error("Test execution failed:", err);
});
