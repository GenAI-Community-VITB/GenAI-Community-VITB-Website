/**
 * Gen AI Community VIT Bhopal — Unified Google Apps Script Backend
 * 
 * Functions provided:
 * 1. Google Drive Relay (Bypasses service account storage quota limits by uploading directly to Personal/Club Google Drive with 15GB)
 * 2. Dynamic Teams Dropdown Synchronization (Syncs form dropdowns with live Supabase database)
 * 3. Automated Form Submission Stream (Auto-onboards new members from Google Form into Supabase)
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Form or Google Sheet > Extensions > Apps Script.
 * 2. Paste this entire code into `Code.gs`.
 * 3. Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DRIVE_RELAY_TOKEN in Script Properties.
 *    Set GOOGLE_DRIVE_RELAY_TOKEN to the same token in the website environment.
 *    Keep payment/backup folders private; old public permissions need separate revocation.
 * 4. Deploy as Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Select type: "Web app"
 *    - Execute as: "Me (your google account)"
 *    - Who has access: "Anyone" (Required for webhooks & file uploads)
 * 5. Copy the Web App URL and paste into your `.env.local`:
 *    `GOOGLE_DRIVE_RELAY_URL="https://script.google.com/macros/s/.../exec"`
 *    `GOOGLE_FORM_WEBHOOK_URL="https://script.google.com/macros/s/.../exec"`
 */

const SCRIPT_CONFIG = PropertiesService.getScriptProperties();
const SUPABASE_URL = SCRIPT_CONFIG.getProperty("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = SCRIPT_CONFIG.getProperty("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Handles all POST requests sent to the Web App URL:
 * - Direct Google Drive file uploads from Next.js backend
 * - Webhook triggers from Next.js when teams are added/modified
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Empty request payload" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const relayToken = SCRIPT_CONFIG.getProperty("DRIVE_RELAY_TOKEN");
    if (!relayToken || payload.token !== relayToken) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const action = payload.action || "sync_teams";

    // 1. Google Drive Buffer Upload Relay
    if (action === "upload") {
      const result = handleDriveUpload(payload);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sync Teams Dropdown
    if (action === "sync_teams" || action === "ping") {
      syncTeamsDropdown();
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, message: "Teams synchronized successfully." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Failsafe Automated Registration Google Form Logger
    if (action === "failsafe_registration_form_submit") {
      const result = handleFailsafeRegistrationFormSubmit(payload.data || payload);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: "Unknown action: " + action })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles direct file buffer uploads from Next.js to Google Drive.
 */
function handleDriveUpload(data) {
  const fileName = data.fileName || ("upload_" + Date.now() + ".png");
  const mimeType = data.mimeType || "image/png";
  const base64 = data.base64;
  const targetFolderId = data.folderId;
  const folderPath = data.folderPath || [];

  if (!base64) {
    return { success: false, error: "Missing base64 file data" };
  }

  const decodedBytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  let targetFolder = null;

  if (targetFolderId && targetFolderId !== "root") {
    try {
      targetFolder = DriveApp.getFolderById(targetFolderId);
    } catch (err) {
      Logger.log("Could not open folderId " + targetFolderId + ", using root");
    }
  }

  if (!targetFolder) {
    targetFolder = DriveApp.getRootFolder();
  }

  // Traverse or create nested subfolder paths (e.g. ["GenAI Community", "Payment Proofs", "Event Title", "2026"])
  if (folderPath && folderPath.length > 0) {
    for (var i = 0; i < folderPath.length; i++) {
      var subName = folderPath[i];
      if (!subName) continue;
      var existingFolders = targetFolder.getFoldersByName(subName);
      if (existingFolders.hasNext()) {
        targetFolder = existingFolders.next();
      } else {
        targetFolder = targetFolder.createFolder(subName);
      }
    }
  }

  if (targetFolder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    throw new Error("Upload folder must be private.");
  }

  // Create file in target folder
  const file = targetFolder.createFile(blob);
  
  // New files must not be readable anonymously, including via inherited folder access.
  try {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    if (data.viewerEmail) file.addViewer(data.viewerEmail);
  } catch (permErr) {
    file.setTrashed(true);
    throw new Error("Unable to make uploaded file private; use a private storage folder.");
  }

  return {
    success: true,
    private: true,
    fileId: file.getId(),
    fileName: file.getName(),
    directUrl: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    viewUrl: file.getUrl(),
    downloadUrl: file.getDownloadUrl()
  };
}

/**
 * Handles Google Form Submissions for automatic new member registration.
 * Set trigger: "From form" -> "On form submit"
 */
function onFormSubmit(e) {
  try {
    if (!e || !e.response) {
      Logger.log("EXCEPTION: Event object is missing. Check that trigger is set to 'On form submit'.");
      return;
    }

    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    const data = {};
    itemResponses.forEach(function(item) {
      data[item.getItem().getTitle()] = item.getResponse();
    });

    Logger.log("Form data received: " + JSON.stringify(data));

    const name = (data["Name"] || "").trim();
    const role = (data["Role"] || "").trim();
    const position = (data["Position"] || "").trim();
    const linkedinUrl = (data["LinkedIn URL"] || "").trim() || null;
    const teamName = (data["Team Name"] || "").trim();
    
    const imageUploadIds = data["Image Upload"];
    const imageFileId = Array.isArray(imageUploadIds) ? imageUploadIds[0] : (imageUploadIds || null);

    let finalImageUrl = null;

    if (imageFileId) {
      try {
        const file = DriveApp.getFileById(imageFileId);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        finalImageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      } catch (fileErr) {
        Logger.log("Could not process drive image: " + fileErr.toString());
      }
    }

    // Resolve Team Name -> Team ID from Supabase
    let teamId = null;
    if (teamName) {
      try {
        const teamsRes = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/teams?select=id,name", {
          method: "get",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY
          },
          muteHttpExceptions: true
        });

        if (teamsRes.getResponseCode() >= 200 && teamsRes.getResponseCode() < 300) {
          const teams = JSON.parse(teamsRes.getContentText());
          const match = teams.find(function(t) { return t.name.toLowerCase() === teamName.toLowerCase(); });
          if (match) teamId = match.id;
        }
      } catch (teamErr) {
        Logger.log("Error resolving team: " + teamErr.toString());
      }
    }

    // Insert pending member into Supabase
    const memberData = {
      name: name,
      role: role,
      position: position,
      linkedin_url: linkedinUrl,
      team_id: teamId,
      image_url: finalImageUrl,
      status: "pending"
    };

    const insertRes = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/members", {
      method: "post",
      headers: {
        "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(memberData),
      muteHttpExceptions: true
    });

    Logger.log("Insert result (" + insertRes.getResponseCode() + "): " + insertRes.getContentText());

  } catch (error) {
    Logger.log("EXCEPTION in onFormSubmit: " + error.toString());
  }
}

/**
 * Fetches latest teams from Supabase and dynamically updates the "Team Name" dropdown in Google Forms.
 */
function syncTeamsDropdown() {
  try {
    const form = FormApp.getActiveForm();
    if (!form) {
      Logger.log("No active Google Form attached.");
      return;
    }

    const items = form.getItems(FormApp.ItemType.LIST);
    let teamQuestion = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle() === "Team Name") {
        teamQuestion = items[i].asListItem();
        break;
      }
    }

    if (!teamQuestion) {
      Logger.log("Could not find question 'Team Name'");
      return;
    }

    const teamsRes = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/teams?select=name", {
      method: "get",
      headers: {
        "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "apikey": SUPABASE_SERVICE_ROLE_KEY
      },
      muteHttpExceptions: true
    });

    if (teamsRes.getResponseCode() >= 200 && teamsRes.getResponseCode() < 300) {
      const teams = JSON.parse(teamsRes.getContentText());
      if (teams.length > 0) {
        const choices = teams.map(function(t) { return teamQuestion.createChoice(t.name); });
        teamQuestion.setChoices(choices);
        Logger.log("Synced " + teams.length + " teams to dropdown.");
      }
    }
  } catch (err) {
    Logger.log("Error in syncTeamsDropdown: " + err.toString());
  }
}

/**
 * Handles automated failsafe registration submission.
 * Logs the full student registration directly into the active Google Sheet / Form Responses tab.
 */
function handleFailsafeRegistrationFormSubmit(regData) {
  try {
    if (!regData) {
      return { success: false, error: "Missing registration payload" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Form Responses (Failsafe)") || ss.getSheetByName("Form Responses 1") || ss.getSheetByName("Registrations");

    if (!sheet) {
      sheet = ss.insertSheet("Form Responses (Failsafe)");
      sheet.appendRow([
        "Timestamp (IST)",
        "Registration ID",
        "Registration Number",
        "Event Title",
        "Full Name",
        "VIT Reg Number",
        "Branch",
        "Personal Email",
        "College Email",
        "Phone Number",
        "Amount (INR)",
        "Transaction ID",
        "Payment Proof Link",
        "Source",
      ]);
    }

    const row = [
      regData.timestamp || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
      regData.registrationId || "",
      regData.registrationNumber || "",
      regData.eventTitle || "",
      regData.fullName || "",
      regData.vitRegistrationNumber || "",
      regData.branchName || "",
      regData.personalEmail || "",
      regData.collegeEmail || "",
      regData.phoneNumber || "",
      regData.amount || 0,
      regData.transactionId || "",
      regData.driveViewUrl || regData.driveFileId || "",
      regData.registrationSource || "online",
    ];

    sheet.appendRow(row.map(value => typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? "'" + value : value));
    Logger.log("Failsafe registration logged: " + JSON.stringify(row));

    return {
      success: true,
      message: "Registration successfully recorded into Google Form failsafe backup.",
      registrationNumber: regData.registrationNumber,
    };
  } catch (err) {
    Logger.log("Error in handleFailsafeRegistrationFormSubmit: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Automated Free Scheduled Trigger to sync LinkedIn Posts to the website Blogs portal.
 * Set trigger: Time-driven -> Day timer (e.g. Every 6 or 12 hours)
 */
function triggerLinkedInBlogsSync() {
  const WEBHOOK_URL = SCRIPT_CONFIG.getProperty("BLOG_SYNC_URL");
  const cronSecret = SCRIPT_CONFIG.getProperty("CRON_SECRET");
  if (!WEBHOOK_URL || !cronSecret) throw new Error("Configure BLOG_SYNC_URL and CRON_SECRET in Script Properties.");
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "get",
      headers: { Authorization: "Bearer " + cronSecret },
      muteHttpExceptions: true
    });
    Logger.log("LinkedIn Blogs Sync Trigger Response: " + response.getContentText());
  } catch (err) {
    Logger.log("Error in triggerLinkedInBlogsSync: " + err.toString());
  }
}
