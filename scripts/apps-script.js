/**
 * Gen AI Club - Automated Member Data Stream
 * Google Apps Script for Google Forms
 * 
 * IMPORTANT: Your Google Form MUST have the following EXACT question titles (case-sensitive):
 * - "Name" (Short answer)
 * - "Role" (Short answer)
 * - "Position" (Short answer)
 * - "LinkedIn URL" (Short answer)
 * - "Team Name" (Dropdown)
 * - "Image Upload" (File upload)
 */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xyz.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";           // used for reading teams & uploading images

function onFormSubmit(e) {
  try {
    // Use e.response (more reliable than e.namedValues)
    if (!e || !e.response) {
      Logger.log("EXCEPTION: Event object is missing. Check that the trigger is set to 'From form' > 'On form submit'.");
      return;
    }

    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // Build a key-value map from question title -> answer
    const data = {};
    itemResponses.forEach(function(item) {
      data[item.getItem().getTitle()] = item.getResponse();
    });

    Logger.log("Form data: " + JSON.stringify(data));

    const name         = (data["Name"] || "").trim();
    const role         = (data["Role"] || "").trim();
    const position     = (data["Position"] || "").trim();
    const linkedinUrl  = (data["LinkedIn URL"] || "").trim() || null;
    const teamName     = (data["Team Name"] || "").trim();
    // e.response returns file uploads as an array of Drive File IDs directly (not URLs)
    const imageUploadIds = data["Image Upload"];
    const imageFileId = Array.isArray(imageUploadIds) ? imageUploadIds[0] : (imageUploadIds || null);

    Logger.log("Parsed - Name: " + name + ", Role: " + role + ", Team: " + teamName);
    Logger.log("Image file ID from Drive: " + imageFileId);

    let finalImageUrl = null;

    // Phase II: File Retrieval & Storage Migration
    if (imageFileId) {
      Logger.log("Fetching file from Drive: " + imageFileId);
      const file = DriveApp.getFileById(imageFileId);
        const fileBlob = file.getBlob();
        const ext = file.getName().split('.').pop() || 'jpg';
        const storagePath = "form-uploads/" + Date.now() + "-" + Math.floor(Math.random() * 10000) + "." + ext;

        const uploadUrl = SUPABASE_URL + "/storage/v1/object/club-assets/" + storagePath;
        const uploadResponse = UrlFetchApp.fetch(uploadUrl, {
          method: "post",
          headers: {
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": fileBlob.getContentType()
          },
          payload: fileBlob.getBytes(),
          muteHttpExceptions: true
        });

        Logger.log("Image upload status: " + uploadResponse.getResponseCode());
        Logger.log("Image upload response: " + uploadResponse.getContentText());

        if (uploadResponse.getResponseCode() >= 200 && uploadResponse.getResponseCode() < 300) {
          finalImageUrl = SUPABASE_URL + "/storage/v1/object/public/club-assets/" + storagePath;
          Logger.log("Final image URL: " + finalImageUrl);
        }
    }

    // Resolve Team Name -> Team ID
    let teamId = null;
    if (teamName) {
      const teamsResponse = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/teams?select=id,name", {
        method: "get",
        headers: {
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "apikey": SUPABASE_ANON_KEY
        },
        muteHttpExceptions: true
      });

      Logger.log("Teams fetch status: " + teamsResponse.getResponseCode());
      Logger.log("Teams response: " + teamsResponse.getContentText());

      if (teamsResponse.getResponseCode() >= 200 && teamsResponse.getResponseCode() < 300) {
        const teams = JSON.parse(teamsResponse.getContentText());
        Logger.log("Available teams: " + JSON.stringify(teams.map(function(t) { return t.name; })));
        const match = teams.find(function(t) { return t.name.toLowerCase() === teamName.toLowerCase(); });
        if (match) {
          teamId = match.id;
          Logger.log("Resolved team ID: " + teamId);
        } else {
          Logger.log("WARNING: No team matched name: '" + teamName + "'");
        }
      }
    }

    // Phase III: Insert using ANON KEY + RLS policy "Allow anon to insert pending members"
    const memberData = {
      name: name,
      role: role,
      position: position,
      linkedin_url: linkedinUrl || null,
      team_id: teamId,
      image_url: finalImageUrl,
      status: "pending"
    };

    Logger.log("Inserting member: " + JSON.stringify(memberData));

    const insertResponse = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/members", {
      method: "post",
      headers: {
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(memberData),
      muteHttpExceptions: true
    });

    Logger.log("Insert status: " + insertResponse.getResponseCode());
    Logger.log("Insert response: " + insertResponse.getContentText());

    if (insertResponse.getResponseCode() >= 200 && insertResponse.getResponseCode() < 300) {
      Logger.log("SUCCESS: Pending member '" + name + "' created!");
    } else {
      Logger.log("FAILED to insert. See response above.");
    }

  } catch (error) {
    Logger.log("EXCEPTION: " + error.toString());
  }
}

/**
 * Phase V: Dynamic Dropdown Sync
 * Fetches the latest teams from Supabase and updates the "Team Name" dropdown.
 */
function syncTeamsDropdown() {
  const form = FormApp.getActiveForm();
  if (!form) return;

  const items = form.getItems(FormApp.ItemType.LIST);
  let teamQuestion = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].getTitle() === "Team Name") {
      teamQuestion = items[i].asListItem();
      break;
    }
  }

  if (!teamQuestion) {
    Logger.log("Could not find a dropdown question named 'Team Name'.");
    return;
  }

  const teamsResponse = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/teams?select=name", {
    method: "get",
    headers: {
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "apikey": SUPABASE_ANON_KEY
    },
    muteHttpExceptions: true
  });

  if (teamsResponse.getResponseCode() >= 200 && teamsResponse.getResponseCode() < 300) {
    const teams = JSON.parse(teamsResponse.getContentText());
    if (teams.length > 0) {
      const choices = teams.map(function(t) { return teamQuestion.createChoice(t.name); });
      teamQuestion.setChoices(choices);
      Logger.log("Synced " + teams.length + " teams to the dropdown.");
    }
  }
}

/**
 * Webhook endpoint — called by Next.js when a team is added/deleted.
 */
function doPost(e) {
  syncTeamsDropdown();
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Teams synced." }))
    .setMimeType(ContentService.MimeType.JSON);
}
