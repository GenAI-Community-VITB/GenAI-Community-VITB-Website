const CLUB_NAME = "Generative AI Community";
const INSTITUTION = "VIT Bhopal University";
const GOLD_COLOR = "#f5b642";
const DARK_BG = "#0c0a07";

function baseEmailLayout(content: string, preheader: string = ""): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CLUB_NAME} · ${INSTITUTION}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050403; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; color: #050403;">
    ${preheader || "Official communications from Generative AI Community - VIT Bhopal"}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050403; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${DARK_BG}; border: 1px solid #2a2215; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.85);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #1f1a10; text-align: center; background: radial-gradient(ellipse at top, #241c0e 0%, #0c0a07 100%);">
              <div style="display: inline-block; padding: 4px 14px; border-radius: 9999px; border: 1px solid rgba(245, 182, 66, 0.4); background-color: rgba(245, 182, 66, 0.1); margin-bottom: 12px;">
                <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${GOLD_COLOR}; font-family: monospace;">
                  ${INSTITUTION}
                </p>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                ${CLUB_NAME}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #a1a1aa;">Official Technical & Event Portal</p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding: 24px 32px; background-color: #080604; border-top: 1px solid #1f1a10; text-align: center;">
              <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #ffd06a; line-height: 1.5; font-weight: 500;">
                  🔔 <strong>Delivery Notice:</strong> If this email appears in your Promotions or Spam/Junk tab, please mark as <em>"Not Spam / Move to Inbox"</em> to receive instant event reminders.
                </p>
              </div>
              <p style="margin: 8px 0 6px 0; font-size: 12px; color: #71717a;">
                Generative AI Community · VIT Bhopal University, Kotri Kalan, Ashta, MP - 466114
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b; font-family: monospace;">
                Automated System Message · GenAI Ops Matrix v2026.2
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getSubmissionReceivedTemplate(params: {
  fullName: string;
  vitRegNumber: string;
  registrationNumber: string;
  eventTitle: string;
  amount: number;
  transactionId: string;
}): { subject: string; html: string } {
  const { fullName, vitRegNumber, registrationNumber, eventTitle, amount, transactionId } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: rgba(245, 182, 66, 0.15); border: 1px solid rgba(245, 182, 66, 0.4); color: ${GOLD_COLOR}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
        Registration Successful — Verification Pending
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Registration Successful</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">${eventTitle} · Ref ID: ${registrationNumber}</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      Your registration form submission has been successfully received by our systems. Payment verification is currently pending review by the club finance team.
    </p>

    <!-- Details Card -->
    <div style="background-color: #120e09; border: 1px solid #2a2215; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="8">
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace; width: 42%;">Pass Reference ID:</td>
          <td style="font-size: 15px; font-weight: 800; color: ${GOLD_COLOR}; font-family: monospace;">${registrationNumber}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">VIT Reg Number:</td>
          <td style="font-size: 14px; font-weight: 600; color: #ffffff; font-family: monospace;">${vitRegNumber}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">Transaction / UTR:</td>
          <td style="font-size: 14px; color: #ffffff; font-family: monospace;">${transactionId}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">Amount Paid:</td>
          <td style="font-size: 14px; font-weight: 700; color: #ffffff;">₹${amount}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">Verification Status:</td>
          <td style="font-size: 13px; font-weight: 700; color: #f59e0b;">⏳ Awaiting Finance Approval</td>
        </tr>
      </table>
    </div>

    <!-- Notice Box -->
    <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #ffd06a;">
        <strong>What's Next:</strong> Our Finance team will inspect your payment proof within 24 hours. Upon successful verification, your official entry pass containing your unique cryptographic QR code will be dispatched to your email.
      </p>
    </div>
  `;

  return {
    subject: `Registration Received: ${eventTitle} (${registrationNumber})`,
    html: baseEmailLayout(content, `Registration details received for ${eventTitle}. Reference ID: ${registrationNumber}`),
  };
}

export function getRegistrationConfirmedTemplate(params: {
  fullName: string;
  vitRegNumber: string;
  registrationNumber: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  qrContentId: string;
}): { subject: string; html: string } {
  const { fullName, vitRegNumber, registrationNumber, eventTitle, eventDate, venue, qrContentId } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 28px;">
      <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1.5px; font-family: monospace;">
        Verified & Confirmed
      </span>
      <h2 style="margin: 14px 0 6px 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
        Official Entrance QR Pass
      </h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">${eventTitle}</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName}</strong> (${vitRegNumber}),
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      Your payment verification is complete! Here is your official admission pass. Please save or screenshot this QR code to present at the venue check-in desk.
    </p>

    <!-- Master QR Pass Ticket Container -->
    <div style="background-color: #120e09; border: 2px solid ${GOLD_COLOR}; border-radius: 20px; padding: 28px 20px; text-align: center; margin-bottom: 24px; box-shadow: 0 0 35px rgba(245, 182, 66, 0.15);">
      <p style="margin: 0 0 4px 0; font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">
        Admit Pass Identifier
      </p>
      <p style="margin: 0 0 20px 0; font-size: 24px; font-weight: 900; color: ${GOLD_COLOR}; font-family: monospace; letter-spacing: 1px;">
        ${registrationNumber}
      </p>
      
      <!-- QR Image Frame -->
      <div style="background-color: #ffffff; padding: 14px; border-radius: 16px; display: inline-block; margin-bottom: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
        <img src="cid:${qrContentId}" alt="Event Entry QR Code Pass" width="220" height="220" style="display: block; border: 0;" />
      </div>

      <p style="margin: 0; font-size: 13px; font-weight: 700; color: #ffffff;">
        Scan at Gate for Instant Check-In
      </p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #71717a; font-family: monospace;">
        Cryptographically Verified Entry Pass
      </p>
    </div>

    <!-- Event Logistics Table -->
    <div style="background-color: #120e09; border: 1px solid #2a2215; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="8">
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace; width: 32%;">Event:</td>
          <td style="font-size: 14px; font-weight: 700; color: #ffffff;">${eventTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">Date & Time:</td>
          <td style="font-size: 14px; font-weight: 600; color: #ffffff;">${eventDate}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #71717a; text-transform: uppercase; font-family: monospace;">Venue:</td>
          <td style="font-size: 14px; font-weight: 600; color: #ffffff;">${venue}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: `Entry Pass Confirmed: ${eventTitle} (Pass ID: ${registrationNumber})`,
    html: baseEmailLayout(content, `Your entry QR pass for ${eventTitle} is ready. Pass ID: ${registrationNumber}`),
  };
}

export function getPaymentRejectedTemplate(params: {
  fullName: string;
  registrationNumber: string;
  eventTitle: string;
  rejectionReason: string;
  rejectionExplanation?: string;
}): { subject: string; html: string } {
  const { fullName, registrationNumber, eventTitle, rejectionReason, rejectionExplanation } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
        Verification Notice
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Payment Update Required</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">${eventTitle} · Ref: ${registrationNumber}</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      Our Finance team reviewed your payment submission for <strong>${eventTitle}</strong>, but was unable to verify the transaction proof provided.
    </p>

    <div style="background-color: #1a0f0f; border: 1px solid #4a1d1d; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #f87171; text-transform: uppercase; font-family: monospace; font-weight: 700;">Reason Identified:</p>
      <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #ffffff;">${rejectionReason}</p>
      ${
        rejectionExplanation
          ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa; font-family: monospace;">Staff Notes:</p><p style="margin: 0; font-size: 13px; color: #d4d4d8; line-height: 1.5;">${rejectionExplanation}</p>`
          : ""
      }
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      If you have the valid payment receipt or believe this is an error, please reply directly to this email or contact the GenAI Community Finance Lead.
    </p>
  `;

  return {
    subject: `Payment Verification Update: ${eventTitle} (${registrationNumber})`,
    html: baseEmailLayout(content, `Action required regarding payment verification for ${eventTitle}`),
  };
}

export function getCustomEmailTemplate(params: {
  subject: string;
  message: string;
  senderRole?: string;
}): { subject: string; html: string } {
  const { subject, message, senderRole = "GenAI Community Staff" } = params;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #ffffff;">${subject}</h2>
    <div style="font-size: 15px; line-height: 1.7; color: #d4d4d8; white-space: pre-wrap; margin-bottom: 24px;">
      ${message}
    </div>
    <p style="margin: 24px 0 0 0; font-size: 13px; color: #71717a; font-family: monospace;">
      Dispatched by <strong>${senderRole}</strong> · GenAI Community VIT Bhopal
    </p>
  `;

  return {
    subject,
    html: baseEmailLayout(content, subject),
  };
}

export function getFinanceReminderTemplate(params: {
  pendingCount: number;
  oldestPendingHours: number;
}): { subject: string; html: string } {
  const { pendingCount, oldestPendingHours } = params;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #ffffff;">Finance Pending Queue Reminder</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      There are currently <strong>${pendingCount}</strong> event registrations awaiting payment verification in the Finance Operations matrix.
    </p>
    <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #ffd06a;">
        Oldest pending submission has been waiting for approximately <strong>${oldestPendingHours} hours</strong>.
      </p>
    </div>
    <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
      Please log in to the admin portal and navigate to the Finance Queue to review and verify these transactions.
    </p>
  `;

  return {
    subject: `Action Reminder: ${pendingCount} Event Registrations Awaiting Finance Verification`,
    html: baseEmailLayout(content, `${pendingCount} event registrations awaiting finance verification`),
  };
}

export function getOTPEmailTemplate(params: {
  fullName: string;
  email: string;
  otpCode: string;
  validMinutes?: number;
}): { subject: string; html: string } {
  const { fullName, email, otpCode, validMinutes = 10 } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: rgba(245, 182, 66, 0.15); border: 1px solid rgba(245, 182, 66, 0.4); color: ${GOLD_COLOR}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
        Security Verification
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Password Reset Request</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">GenAI Community VIT Bhopal</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName || "Club Member"}</strong> (${email}),
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      We received a request to reset your password. Use the single-use OTP code below to verify your identity and configure a new password.
    </p>

    <!-- OTP Display Box -->
    <div style="background-color: #120e09; border: 2px solid ${GOLD_COLOR}; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">
        One-Time Verification Code
      </p>
      <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: ${GOLD_COLOR}; font-family: monospace; padding: 8px 0;">
        ${otpCode}
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #f59e0b; font-family: monospace;">
        ⏱️ Expires in ${validMinutes} minutes
      </p>
    </div>

    <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #ffd06a; line-height: 1.5;">
        🔒 <strong>Security Warning:</strong> Never share this code with anyone. Club executives and technical leads will never ask for your verification code.
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #71717a;">
      If you did not request this password reset, please ignore this email or notify the Technical Lead immediately.
    </p>
  `;

  return {
    subject: `Password Reset Verification Code: ${otpCode} (GenAI Community)`,
    html: baseEmailLayout(content, `Your password reset verification code is ${otpCode}`),
  };
}

export function getLoginSecurityAlertTemplate(params: {
  fullName: string;
  email: string;
  loginTime: string;
  roleTitle?: string;
  ipAddress?: string;
}): { subject: string; html: string } {
  const { fullName, email, loginTime, roleTitle = "Team Member", ipAddress = "Verified Network" } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
        Security Notice · Account Activity
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">New Account Sign-in</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">Operations Control Portal</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName || "Club Member"}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      Your official account (<strong>${email}</strong>) has just logged into the GenAI Community Admin Portal.
    </p>

    <!-- Sign-in Details Table -->
    <div style="background-color: #120e09; border: 1px solid #2a2215; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a; width: 40%;">Timestamp (IST):</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600; font-family: monospace;">${loginTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Staff Role:</td>
          <td style="padding: 6px 0; font-size: 13px; color: ${GOLD_COLOR}; font-weight: 700;">${roleTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Client Target:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-family: monospace;">Web Operations Console</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #ffd06a; line-height: 1.5;">
        🔒 <strong>Security Warning:</strong> If you did not perform this login, someone else may have gained access to your account. Please use the <strong>Forgot / Reset Password</strong> option on the login portal to immediately reset your password with email OTP.
      </p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #71717a;">
      Generative AI Community VIT Bhopal · Security Operations System
    </p>
  `;

  return {
    subject: `Security Alert: New Sign-in to GenAI Community Portal (${email})`,
    html: baseEmailLayout(content, `New sign-in detected on your account at ${loginTime}`),
  };
}

export function getEventReminderTemplate(params: {
  fullName: string;
  vitRegNumber: string;
  registrationNumber: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  venue: string;
  qrContentId?: string;
}): { subject: string; html: string } {
  const {
    fullName,
    vitRegNumber,
    registrationNumber,
    eventTitle,
    eventDate,
    eventTime = "10:00 AM IST",
    venue,
    qrContentId,
  } = params;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: rgba(245, 182, 66, 0.15); border: 1px solid rgba(245, 182, 66, 0.4); color: ${GOLD_COLOR}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
        ⚡ Live Event Reminder
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Get Ready for ${eventTitle}</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">Pass ID: ${registrationNumber}</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      This is a quick reminder that <strong>${eventTitle}</strong> is happening soon! Your registration is confirmed and we look forward to seeing you.
    </p>

    <!-- Schedule Details Card -->
    <div style="background-color: #120e09; border: 1px solid #2a2215; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a; width: 40%;">Event Date:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600;">${eventDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Reporting Time:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 600;">${eventTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a;">Venue:</td>
          <td style="padding: 6px 0; font-size: 13px; color: ${GOLD_COLOR}; font-weight: 700;">${venue}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #71717a;">VIT Reg Number:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-family: monospace;">${vitRegNumber}</td>
        </tr>
      </table>
    </div>

    ${
      qrContentId
        ? `
      <div style="text-align: center; margin-bottom: 24px; padding: 20px; background-color: #120e09; border: 1px dashed #2a2215; border-radius: 16px;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
          Your Gate Admission QR Code
        </p>
        <img src="cid:${qrContentId}" alt="Entry QR Pass" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 12px; border: 2px solid ${GOLD_COLOR};" />
        <p style="margin: 12px 0 0 0; font-size: 11px; color: #71717a;">
          Please present this QR code at the registration desk for instant entry.
        </p>
      </div>
    `
        : ""
    }

    <div style="background-color: #1a1408; border: 1px solid #4a3814; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #ffd06a; line-height: 1.5;">
        💡 <strong>Quick Tip:</strong> Please arrive 15 minutes before the reporting time with your college ID card.
      </p>
    </div>

    <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
      Questions? Reach out to our team at <a href="mailto:registrations@genaiclubvitb.in" style="color: ${GOLD_COLOR}; text-decoration: none;">registrations@genaiclubvitb.in</a>.
    </p>
  `;

  return {
    subject: `Event Reminder: ${eventTitle} is happening on ${eventDate}!`,
    html: baseEmailLayout(content, `Reminder for ${eventTitle} on ${eventDate}`),
  };
}



