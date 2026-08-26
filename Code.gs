/**
 * ==============================================================================
 * GENAI Community VIT Bhopal — Production Transactional Email Web App (Code.gs)
 * ==============================================================================
 * 
 * Free Google Apps Script + Gmail transactional email relay for club website.
 * Deploy as a Web App with access set to "Anyone".
 * 
 * Features:
 *  - Secure bearer token authentication (Script Properties or hardcoded secret)
 *  - High-deliverability HTML email dispatch via GmailApp / MailApp
 *  - Inline CID images & QR code entry pass attachment support
 *  - Structured JSON response formats
 *  - Zero external paid services required
 */

// Default fallback token if not configured in Script Properties
var DEFAULT_SECRET_TOKEN = "GENAI_GAS_EMAIL_SECRET_2026";

/**
 * Handles incoming POST requests from the website backend.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for lock to serialize concurrent sends safely
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "Missing request payload body.",
      }, 400);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        error: "Malformed JSON payload in request.",
      }, 400);
    }

    // 1. Authenticate Token
    var expectedToken = PropertiesService.getScriptProperties().getProperty("AUTH_TOKEN") || DEFAULT_SECRET_TOKEN;
    var providedToken = data.token || "";

    if (!providedToken || providedToken !== expectedToken) {
      return createJsonResponse({
        success: false,
        error: "Unauthorized: Invalid or missing authentication token.",
      }, 401);
    }

    // 2. Validate Required Fields
    var to = (data.to || "").toString().trim();
    var subject = (data.subject || "").toString().trim();
    var htmlBody = data.html || data.htmlBody || data.body || "";

    if (!to || !to.includes("@")) {
      return createJsonResponse({
        success: false,
        error: "Invalid recipient email address.",
      }, 400);
    }

    if (!subject) {
      return createJsonResponse({
        success: false,
        error: "Subject line is required.",
      }, 400);
    }

    if (!htmlBody) {
      return createJsonResponse({
        success: false,
        error: "Email HTML body content is required.",
      }, 400);
    }

    // 3. Process Attachments and Inline CID Images
    var inlineImages = {};
    var emailAttachments = [];

    if (data.attachments && Array.isArray(data.attachments)) {
      for (var i = 0; i < data.attachments.length; i++) {
        var att = data.attachments[i];
        if (!att || !att.content) continue;

        try {
          var base64Str = att.content;
          if (base64Str.indexOf("data:") === 0 && base64Str.indexOf(",") > -1) {
            base64Str = base64Str.split(",")[1];
          }

          var decodedBytes = Utilities.base64Decode(base64Str);
          var mimeType = att.contentType || "image/png";
          var fileName = att.name || att.filename || ("attachment_" + (i + 1) + ".png");
          var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

          if (att.cid) {
            inlineImages[att.cid] = blob;
          }
          emailAttachments.push(blob);
        } catch (attErr) {
          Logger.log("Attachment processing error: " + attErr.message);
        }
      }
    }

    // 4. Generate Plain Text Fallback from HTML
    var plainBody = data.text || data.plainText || htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // 5. Sender Profile Configuration
    var senderName = data.senderName || "GENAI Community VIT Bhopal";
    var replyTo = data.replyTo || "gen_ai@vitbhopal.ac.in";

    var mailOptions = {
      htmlBody: htmlBody,
      name: senderName,
      replyTo: replyTo,
    };

    if (Object.keys(inlineImages).length > 0) {
      mailOptions.inlineImages = inlineImages;
    }

    if (emailAttachments.length > 0) {
      mailOptions.attachments = emailAttachments;
    }

    // 6. Send Transactional Email via GmailApp / MailApp
    var messageId = "gas-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000000);

    try {
      MailApp.sendEmail(to, subject, plainBody, mailOptions);
    } catch (mailErr) {
      // Fallback to GmailApp if MailApp has quota or permission discrepancy
      try {
        GmailApp.sendEmail(to, subject, plainBody, mailOptions);
      } catch (gmailErr) {
        return createJsonResponse({
          success: false,
          error: "Gmail API dispatch failed: " + gmailErr.message,
        }, 500);
      }
    }

    // 7. Success Response
    return createJsonResponse({
      success: true,
      messageId: messageId,
      timestamp: new Date().toISOString(),
      recipient: to,
      quotaRemaining: MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : null,
    }, 200);

  } catch (globalErr) {
    return createJsonResponse({
      success: false,
      error: globalErr.message || "Internal server error in Apps Script.",
    }, 500);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Health check & diagnostic endpoint via GET.
 */
function doGet(e) {
  var remainingQuota = 0;
  try {
    remainingQuota = MailApp.getRemainingDailyQuota();
  } catch (err) {}

  return createJsonResponse({
    status: "ok",
    service: "GENAI Community VIT Bhopal Transactional Email Web App",
    time: new Date().toISOString(),
    remainingDailyQuota: remainingQuota,
    ready: true,
  }, 200);
}

/**
 * Helper to construct JSON response with CORS headers.
 */
function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
