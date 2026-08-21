const CLUB_NAME = "GenAI Community VIT Bhopal";
const GOLD_COLOR = "#f5b642";
const DARK_BG = "#0c0c0c";

function baseEmailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CLUB_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${DARK_BG}; border: 1px solid #222222; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; border-bottom: 1px solid #1a1a1a; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${GOLD_COLOR};">VIT Bhopal University</p>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">${CLUB_NAME}</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #080808; border-top: 1px solid #1a1a1a; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #a3a3a3; background-color: #1a1600; border: 1px solid #423000; border-radius: 8px; padding: 10px; font-weight: 500;">
                🔔 <strong>Notice:</strong> If you cannot find your QR code email, please check your Spam/Junk folder.
              </p>
              <p style="margin: 8px 0 6px 0; font-size: 12px; color: #737373;">
                Generative AI Community · VIT Bhopal University, Kotri Kalan, Ashta, MP - 466114
              </p>
              <p style="margin: 0; font-size: 11px; color: #525252;">
                This is an automated notification. For queries, please contact the GenAI Community Tech/Finance team.
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
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff;">Registration Submitted</h2>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Thank you for registering for <strong>${eventTitle}</strong>. We have received your registration details and payment submission.
    </p>
    <div style="background-color: #141414; border: 1px solid #282828; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td style="font-size: 13px; color: #888888; width: 40%;">Registration ID:</td>
          <td style="font-size: 14px; font-weight: 600; color: ${GOLD_COLOR};">${registrationNumber}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">VIT Reg Number:</td>
          <td style="font-size: 14px; color: #ffffff;">${vitRegNumber}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">Transaction ID:</td>
          <td style="font-size: 14px; color: #ffffff;">${transactionId}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">Amount Paid:</td>
          <td style="font-size: 14px; color: #ffffff;">₹${amount}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">Verification Status:</td>
          <td style="font-size: 14px; font-weight: 600; color: #fbbf24;">Pending Payment Verification</td>
        </tr>
      </table>
    </div>
    <div style="background-color: #1a1600; border: 1px solid #664d00; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fde047;">
        <strong>Important Notice:</strong> Your registration is currently under review by our Finance team. You will receive an official confirmation email along with your entry QR code once the payment screenshot is verified (typically within 24 hours).
      </p>
    </div>
  `;

  return {
    subject: `Registration Submitted: ${eventTitle} (Pending Verification)`,
    html: baseEmailLayout(content),
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
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #064e3b; border: 1px solid #059669; color: #6ee7b7; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
        Confirmed & Verified
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 24px; color: #ffffff;">Registration Confirmed!</h2>
      <p style="margin: 0; font-size: 15px; color: #a3a3a3;">You are all set for ${eventTitle}</p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Hi <strong>${fullName}</strong> (${vitRegNumber}),
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Your payment has been successfully verified! Below is your official event access pass and entry QR code.
    </p>

    <!-- QR Pass Card -->
    <div style="background-color: #111111; border: 2px solid ${GOLD_COLOR}; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 1px;">Registration ID</p>
      <p style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: ${GOLD_COLOR};">${registrationNumber}</p>
      
      <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; display: inline-block; margin-bottom: 16px;">
        <img src="cid:${qrContentId}" alt="Event Entry QR Code" width="220" height="220" style="display: block; border: 0;" />
      </div>

      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">
        Please present this QR code at the entrance for verification.
      </p>
    </div>

    <div style="background-color: #141414; border: 1px solid #282828; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td style="font-size: 13px; color: #888888; width: 35%;">Event:</td>
          <td style="font-size: 14px; font-weight: 600; color: #ffffff;">${eventTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">Date & Time:</td>
          <td style="font-size: 14px; color: #ffffff;">${eventDate}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #888888;">Venue:</td>
          <td style="font-size: 14px; color: #ffffff;">${venue}</td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: `Registration Confirmed! ${eventTitle} (Your Entry Pass: ${registrationNumber})`,
    html: baseEmailLayout(content),
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
      <span style="display: inline-block; background-color: #4c0519; border: 1px solid #be123c; color: #fda4af; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
        Payment Verification Issue
      </span>
      <h2 style="margin: 12px 0 6px 0; font-size: 22px; color: #ffffff;">Registration Update Required</h2>
      <p style="margin: 0; font-size: 14px; color: #a3a3a3;">${eventTitle} (ID: ${registrationNumber})</p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Hi <strong>${fullName}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      Our Finance team reviewed your payment submission for <strong>${eventTitle}</strong>, but was unable to verify the transaction.
    </p>

    <div style="background-color: #171111; border: 1px solid #4a1d1d; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.5px;">Reason for Rejection:</p>
      <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #f87171;">${rejectionReason}</p>
      ${
        rejectionExplanation
          ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #a8a29e;">Additional Notes:</p><p style="margin: 0; font-size: 14px; color: #e5e5e5; line-height: 1.5;">${rejectionExplanation}</p>`
          : ""
      }
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #d4d4d4;">
      If you believe this is an error or have an updated transaction proof, please reply directly to this email or reach out to the GenAI Community Finance Lead.
    </p>
  `;

  return {
    subject: `Action Required: Payment Verification for ${eventTitle}`,
    html: baseEmailLayout(content),
  };
}

export function getCustomEmailTemplate(params: {
  subject: string;
  message: string;
  senderRole?: string;
}): { subject: string; html: string } {
  const { subject, message, senderRole = "GenAI Community Staff" } = params;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff;">${subject}</h2>
    <div style="font-size: 15px; line-height: 1.7; color: #d4d4d4; white-space: pre-wrap; margin-bottom: 24px;">
      ${message}
    </div>
    <p style="margin: 24px 0 0 0; font-size: 13px; color: #888888;">
      Sent by <strong>${senderRole}</strong> · GenAI Community VIT Bhopal
    </p>
  `;

  return {
    subject,
    html: baseEmailLayout(content),
  };
}

export function getFinanceReminderTemplate(params: {
  pendingCount: number;
  oldestPendingHours: number;
}): { subject: string; html: string } {
  const { pendingCount, oldestPendingHours } = params;

  const content = `
    <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff;">Finance Pending Queue Reminder</h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #d4d4d4;">
      There are currently <strong>${pendingCount}</strong> registrations awaiting payment verification in the Finance queue.
    </p>
    <div style="background-color: #1a1600; border: 1px solid #664d00; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #fde047;">
        Oldest pending submission has been waiting for approximately <strong>${oldestPendingHours} hours</strong>.
      </p>
    </div>
    <p style="margin: 0; font-size: 14px; color: #a3a3a3;">
      Please log in to the admin dashboard and navigate to the Finance Pending Queue to review these transactions.
    </p>
  `;

  return {
    subject: `Reminder: ${pendingCount} Event Registrations Awaiting Finance Verification`,
    html: baseEmailLayout(content),
  };
}
