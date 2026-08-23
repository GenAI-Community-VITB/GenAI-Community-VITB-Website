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
        Submission Received
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Registration Under Review</h2>
      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">${eventTitle}</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
      Thank you for registering for <strong>${eventTitle}</strong>. Your registration details and payment screenshot have been safely received by our systems.
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
