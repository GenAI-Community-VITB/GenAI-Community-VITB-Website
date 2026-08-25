import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local / .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Setup Gmail SMTP Transporter
function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  let pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    console.error("❌ Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment.");
    return null;
  }

  pass = pass.replace(/\s+/g, "");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15000,
    socketTimeout: 20000,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
}

const CLUB_NAME = "Generative AI Community";
const INSTITUTION = "VIT Bhopal University";
const GOLD_COLOR = "#f5b642";
const DARK_BG = "#0c0a07";
const PORTAL_URL = "https://www.genaiclubvitb.in/admin/login";
const REPORTING_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdCPWmWTiu-qW5GVBhol2AZgf8gwQvxUllg55O_s9JIANq5Qg/viewform?usp=sharing&ouid=101697190903811844874";

function buildEmailHtml(params: {
  fullName: string;
  assignedToName: string;
  email: string;
  role: string;
  password?: string;
}): string {
  const { assignedToName, fullName, email, role, password } = params;
  const displayName = assignedToName || fullName || "Community Member";
  const displayRole = role ? role.replace(/_/g, " ").toUpperCase() : "STAFF MEMBER";
  const displayPassword = password || "GenAICommunity@2026-27";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IMPORTANT UPDATE — Website Testing & Your Login Credentials | ${CLUB_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050403; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; color: #050403;">
    Important Update: Your IDP & Login Credentials for GenAI Community VIT Bhopal website testing. Complete testing by Saturday.
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050403; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px; background-color: ${DARK_BG}; border: 1px solid #2a2215; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.85);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; border-bottom: 1px solid #1f1a10; text-align: center; background: radial-gradient(ellipse at top, #241c0e 0%, #0c0a07 100%);">
              <div style="display: inline-block; padding: 5px 16px; border-radius: 9999px; border: 1px solid rgba(245, 182, 66, 0.4); background-color: rgba(245, 182, 66, 0.1); margin-bottom: 14px;">
                <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${GOLD_COLOR}; font-family: monospace;">
                  ${INSTITUTION}
                </p>
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                ${CLUB_NAME}
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #fbbf24; font-weight: 600; letter-spacing: 0.5px;">
                🚨 IMPORTANT UPDATE — OFFICIAL WEBSITE TESTING
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #f4f4f5;">
                Dear <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                You are receiving this official communication as a registered club member of the <strong>${CLUB_NAME}</strong>. Your IDP / Login credentials for the official portal are ready. Please review the instructions below carefully and participate in comprehensive testing before our official public launch.
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #120e09; border: 1.5px solid #3d2f17; border-radius: 16px; padding: 24px; margin-bottom: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; border-bottom: 1px solid #231b0c; padding-bottom: 12px;">
                  <span style="font-size: 12px; font-weight: 800; color: ${GOLD_COLOR}; text-transform: uppercase; letter-spacing: 1px; font-family: monospace;">
                    🔐 YOUR PORTAL CREDENTIALS
                  </span>
                  <span style="display: inline-block; padding: 3px 10px; background-color: rgba(245, 182, 66, 0.15); border: 1px solid rgba(245, 182, 66, 0.3); border-radius: 9999px; font-size: 11px; color: ${GOLD_COLOR}; font-weight: 700;">
                    ${displayRole}
                  </span>
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa; width: 38%;">Portal Login URL:</td>
                    <td style="padding: 8px 0;">
                      <a href="${PORTAL_URL}" style="color: #60a5fa; text-decoration: underline; font-weight: 600; word-break: break-all;">
                        ${PORTAL_URL}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa;">Official Email ID:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-weight: 700; font-family: monospace;">
                      ${email}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #a1a1aa;">Temporary Password:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; background-color: #1c150c; border: 1px dashed #785a22; border-radius: 6px; padding: 4px 10px; color: #ffd06a; font-weight: 800; font-family: monospace; font-size: 14px; letter-spacing: 1px;">
                        ${displayPassword}
                      </span>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 20px; text-align: center;">
                  <a href="${PORTAL_URL}" style="display: inline-block; background: linear-gradient(135deg, #f5b642 0%, #d97706 100%); color: #000000; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(245, 182, 66, 0.3);">
                    🔑 Log in to Operations Portal &rarr;
                  </a>
                </div>
              </div>

              <!-- Section 1 -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #ffffff; display: flex; align-items: center;">
                  <span style="color: ${GOLD_COLOR}; margin-right: 8px;">1.</span> LOGIN & SECURITY
                </h3>
                <ul style="margin: 0; padding-left: 22px; font-size: 14px; color: #d4d4d8; line-height: 1.7;">
                  <li><strong>Reset your default password</strong> immediately after your first successful login.</li>
                  <li><strong>Do not share your login credentials</strong> with anyone under any circumstance.</li>
                </ul>
              </div>

              <!-- Section 2 -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #ffffff;">
                  <span style="color: ${GOLD_COLOR}; margin-right: 8px;">2.</span> ROLE TESTING & REGISTRATION
                </h3>
                <ul style="margin: 0; padding-left: 22px; font-size: 14px; color: #d4d4d8; line-height: 1.7;">
                  <li>Test <strong>every single function</strong> available under your assigned portal role.</li>
                  <li>Verify whether each action performs and updates as expected.</li>
                  <li><strong>Everyone must register for the Test Event</strong> using their own personal and college details.</li>
                </ul>
              </div>

              <!-- Section 3 -->
              <div style="margin-bottom: 24px; background-color: #120e09; border-left: 3px solid ${GOLD_COLOR}; padding: 16px; border-radius: 0 12px 12px 0;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 800; color: #ffd06a;">
                  3. EVENT MANAGEMENT TESTING (For Event Creators / Managers)
                </h3>
                <p style="margin: 0 0 10px 0; font-size: 13.5px; color: #d4d4d8; line-height: 1.6;">
                  If your role allows you to <strong>create, modify, or delete events</strong>:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #d4d4d8; line-height: 1.7;">
                  <li>Create an event with the exact title: <strong style="color: #ffffff; background-color: #241c0e; padding: 2px 6px; border-radius: 4px; font-family: monospace;">"TEST EVENT FOR COMMUNITY MEMBERS"</strong></li>
                  <li>Test all <strong>create, edit, and delete</strong> operations available to your account.</li>
                  <li>After completing your tests, <strong>leave the event available with the same name</strong> so other members can test event registration and ticket issuance.</li>
                </ul>
              </div>

              <!-- Section 4 -->
              <div style="margin-bottom: 26px; background-color: #171109; border: 1px solid #382810; border-radius: 14px; padding: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #ffffff;">
                  <span style="color: ${GOLD_COLOR}; margin-right: 8px;">4.</span> REPORTING BUGS & ISSUES
                </h3>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #d4d4d8; line-height: 1.6;">
                  If you encounter <strong>any bug, error, or unexpected behaviour</strong>, please report it immediately using the official Issue Reporting Form.
                </p>
                <p style="margin: 0 0 12px 0; font-size: 13.5px; color: #ffd06a; line-height: 1.5;">
                  ⚡ <em>Every form submission is automatically converted into a prioritized GitHub Issue for the Technical Team.</em>
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13.5px; font-weight: 700; color: #e4e4e7;">
                  Please include the following in your report:
                </p>
                <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 13.5px; color: #a1a1aa; line-height: 1.6;">
                  <li><strong style="color: #e4e4e7;">What went wrong:</strong> Clear summary of the failure.</li>
                  <li><strong style="color: #e4e4e7;">Affected function/role:</strong> E.g. Check-in scanner, payment approval, event creation.</li>
                  <li><strong style="color: #e4e4e7;">Steps to reproduce:</strong> Step-by-step actions that lead to the error.</li>
                  <li><strong style="color: #e4e4e7;">Expected vs actual behaviour:</strong> What should happen vs what actually happened.</li>
                  <li><strong style="color: #e4e4e7;">Screenshot / evidence:</strong> If available.</li>
                </ul>
                <div style="background-color: #241a0d; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
                  <p style="margin: 0; font-size: 12.5px; color: #fbbf24;">
                    ⚠️ <em>Please avoid vague descriptions such as "not working". Provide enough detail for the Tech Team to isolate and resolve the issue.</em>
                  </p>
                </div>
                <div style="text-align: center;">
                  <a href="${REPORTING_FORM_URL}" style="display: inline-block; background-color: #27272a; border: 1px solid #52525b; color: #ffffff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 10px 22px; border-radius: 8px;">
                    📝 Open Issue Reporting Form &rarr;
                  </a>
                </div>
              </div>

              <!-- Section 5 & 6 Side by Side / Stacked -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 800; color: #ffffff;">
                  <span style="color: ${GOLD_COLOR}; margin-right: 8px;">5.</span> LOGIN DETAILS NOT RECEIVED?
                </h3>
                <p style="margin: 0; font-size: 13.5px; color: #d4d4d8; line-height: 1.6;">
                  If any fellow core member or volunteer has not received their IDP/password email, advise them to contact the <strong>Student Coordinator</strong> with their <strong>official VIT Bhopal email ID</strong>.
                </p>
              </div>

              <!-- Section 6 Deadline Alert -->
              <div style="background-color: #211208; border: 1.5px solid #854d0e; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #fbbf24;">
                  ⏳ 6. TESTING DEADLINE — THIS SATURDAY
                </h3>
                <p style="margin: 0; font-size: 13.5px; color: #fef08a; line-height: 1.6;">
                  Please complete your testing and submit <strong>all issues by Saturday</strong> so that the Technical Team can deploy fixes before the platform is officially opened for campus events.
                </p>
              </div>

              <p style="margin: 28px 0 6px 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                Thank you for your active contribution,
              </p>
              <p style="margin: 0; font-size: 14px; color: ${GOLD_COLOR}; font-weight: 700;">
                Executive Panel & Technical Team<br>
                <span style="font-size: 12px; color: #a1a1aa; font-weight: 400;">Generative AI Community · VIT Bhopal University</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #080604; border-top: 1px solid #1f1a10; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">
                Generative AI Community · VIT Bhopal University, Kotri Kalan, Ashta, MP - 466114
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b; font-family: monospace;">
                Internal Member Dispatch · Security Classification: RESTRICTED
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

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const limitArgIdx = args.indexOf("--limit");
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : undefined;
  const toArgIdx = args.indexOf("--to");
  const targetEmail = toArgIdx !== -1 ? args[toArgIdx + 1].trim().toLowerCase() : undefined;

  console.log("==================================================================");
  console.log("GenAI Community VIT Bhopal — Member Testing & IDP Mailer");
  console.log(`Mode: ${isDryRun ? "🔍 DRY RUN (Previewing recipients)" : "🚀 LIVE SENDING (Dispatching Emails via SMTP)"}`);
  if (targetEmail) console.log(`🎯 Filter Target: ${targetEmail}`);
  if (limit) console.log(`🔢 Limit: ${limit}`);
  console.log("==================================================================\n");

  // Fetch user_profiles from Supabase
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, email, password, full_name, assigned_to_name, role, is_active, is_voided")
    .not("email", "is", null);

  if (error) {
    console.error("❌ Failed to query user_profiles:", error.message);
    process.exit(1);
  }

  let recipients = (profiles || []).filter((p) => p.email && p.email.trim().length > 0 && !p.is_voided);

  if (targetEmail) {
    recipients = recipients.filter((p) => p.email?.toLowerCase() === targetEmail);
    if (recipients.length === 0) {
      console.log(`⚠️ No active user profile found with email: ${targetEmail}`);
      process.exit(0);
    }
  }

  if (limit && limit > 0) {
    recipients = recipients.slice(0, limit);
  }

  console.log(`Found ${recipients.length} eligible recipient(s) in \`user_profiles\`:\n`);
  recipients.forEach((p, idx) => {
    console.log(`  ${String(idx + 1).padStart(2, "0")}. ${(p.email || "").padEnd(45)} | ${(p.assigned_to_name || p.full_name || "Member").padEnd(25)} | Role: ${p.role}`);
  });

  if (isDryRun) {
    console.log("\n🔍 DRY RUN SUMMARY:");
    console.log(`Total emails that would be sent: ${recipients.length}`);
    console.log("No emails were dispatched. Run without `--dry-run` to send live emails.");
    return;
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("❌ SMTP transporter could not be initialized. Check GMAIL_USER and GMAIL_APP_PASSWORD.");
    process.exit(1);
  }

  console.log("\n⚡ Beginning email dispatch with rate pacing (600ms per email)...");

  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const p = recipients[i];
    const email = p.email!.trim();
    const displayName = p.assigned_to_name || p.full_name || "Community Member";

    const htmlContent = buildEmailHtml({
      fullName: p.full_name,
      assignedToName: p.assigned_to_name,
      email,
      role: p.role,
      password: p.password,
    });

    const subject = `IMPORTANT UPDATE: Website Testing & Login Credentials | ${CLUB_NAME}`;

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER
          ? `"GenAI Community VIT Bhopal" <${process.env.GMAIL_USER.trim()}>`
          : '"GenAI Community VIT Bhopal" <noreply@genai.local>',
        to: email,
        subject,
        html: htmlContent,
      });

      console.log(`✅ [${i + 1}/${recipients.length}] Sent to: ${email.padEnd(45)} (${displayName})`);
      sentCount++;

      // Log into Supabase email_logs if available
      try {
        await supabase.from("email_logs").insert({
          recipient_email: email,
          email_type: "custom_email",
          status: "sent",
          subject,
          metadata: {
            assigned_to_name: displayName,
            role: p.role,
            purpose: "member_idp_website_testing",
          },
          sent_at: new Date().toISOString(),
        });
      } catch {
        // Non-critical if table logging fails
      }

      // Rate pacing
      await new Promise((res) => setTimeout(res, 600));
    } catch (sendErr: any) {
      console.error(`❌ [${i + 1}/${recipients.length}] Failed sending to ${email}:`, sendErr.message || sendErr);
      failCount++;
    }
  }

  console.log("\n==================================================================");
  console.log(`Dispatch Summary: ${sentCount} successfully sent, ${failCount} failed.`);
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
