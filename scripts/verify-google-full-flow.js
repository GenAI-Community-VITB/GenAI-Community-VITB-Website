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
const folderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

async function testFullFlow() {
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive"
    ]
  });

  console.log("1. Checking Google Sheet connection & tabs...");
  const sheets = google.sheets({ version: "v4", auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  console.log("   Sheet Name:", meta.data.properties.title);
  console.log("   Tabs in Sheet:", meta.data.sheets.map(s => s.properties.title).join(", "));

  console.log("\n2. Testing Drive file creation in root folder...");
  const drive = google.drive({ version: "v3", auth });
  const testFile = await drive.files.create({
    requestBody: {
      name: `integration_test_${Date.now()}.txt`,
      parents: [folderId],
      description: "Automated test file verifying drive upload permissions"
    },
    media: {
      mimeType: "text/plain",
      body: "Google Drive and Sheets integration is 100% operational."
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true
  });
  console.log("   Uploaded Test File ID:", testFile.data.id);
  console.log("   File Link:", testFile.data.webViewLink);

  // Clean up test file
  await drive.files.delete({ fileId: testFile.data.id, supportsAllDrives: true });
  console.log("   Cleaned up test file.");

  console.log("\n3. Testing append to 'Registrations' tab...");
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Registrations!A:A",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          "test-id-" + Date.now(),
          "GENAI-20260820-0001",
          "GenAI Club Launch Event",
          "Verification Test User",
          "24BCE10001",
          "CSE-AIML",
          "test@gmail.com",
          "test@vitbhopal.ac.in",
          "9876543210",
          "verified",
          new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          "QR-TEST-PASS-TOKEN",
          "online"
        ]
      ]
    }
  });
  console.log("   Appended test registration row successfully!");

  console.log("\n=========================================");
  console.log("✅ GOOGLE DRIVE & GOOGLE SHEETS ARE WORKING 100%!");
  console.log("=========================================");
}

testFullFlow().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
