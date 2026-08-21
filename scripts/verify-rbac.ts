import { ROSTER_2026 } from "./seed-logins";
import { checkPermission, isTop6Admin } from "../lib/auth/permissions";
import { UserProfile } from "../lib/types";

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    failed++;
  }
}

function runRBACVerification() {
  console.log("============================================================");
  console.log("Generative AI Community 2026-27 RBAC Permission Matrix Test");
  console.log("Domain: @genai.community");
  console.log("============================================================\n");

  // Helper to build profile from roster
  function getProfile(email: string): UserProfile {
    const item = ROSTER_2026.find((r) => r.email === email);
    if (!item) throw new Error(`Email not in roster: ${email}`);
    return {
      id: "test-uuid",
      email: item.email,
      full_name: item.fullName,
      role: item.primaryRole as any,
      is_active: true,
      roles: [{ id: "r-1", user_id: "test-uuid", team: item.team, position: item.position }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // 1. AI/ML Lead (Top-6 Super Admin)
  console.log("--- 1. Testing AI/ML Lead (aiml.lead@genai.community) ---");
  const aimlLead = getProfile("aiml.lead@genai.community");
  assert("aiml.lead is recognized as Top-6 Admin", isTop6Admin(aimlLead.role, aimlLead.roles));
  assert("aiml.lead can manage members", checkPermission(aimlLead, "manage_members"));
  assert("aiml.lead can assign roles", checkPermission(aimlLead, "assign_roles"));
  assert("aiml.lead can manage events & capacity", checkPermission(aimlLead, "manage_events"));
  assert("aiml.lead can archive events & reset database", checkPermission(aimlLead, "archive_events"));
  assert("aiml.lead can approve/reject finance payments", checkPermission(aimlLead, "approve_payments"));
  assert("aiml.lead can scan & check-in attendees", checkPermission(aimlLead, "manage_attendance"));
  assert("aiml.lead can view system audit logs", checkPermission(aimlLead, "view_audit_logs"));

  // 2. Tech Lead (Top-6 Super Admin)
  console.log("\n--- 2. Testing Technical Lead (tech.lead@genai.community) ---");
  const techLead = getProfile("tech.lead@genai.community");
  assert("tech.lead is recognized as Top-6 Admin", isTop6Admin(techLead.role, techLead.roles));
  assert("tech.lead can manage members", checkPermission(techLead, "manage_members"));
  assert("tech.lead can archive events & reset database", checkPermission(techLead, "archive_events"));
  assert("tech.lead can view system audit logs", checkPermission(techLead, "view_audit_logs"));

  // 3. President (Top-6 Super Admin)
  console.log("\n--- 3. Testing President (president@genai.community) ---");
  const president = getProfile("president@genai.community");
  assert("president is recognized as Top-6 Admin", isTop6Admin(president.role, president.roles));
  assert("president can manage members", checkPermission(president, "manage_members"));
  assert("president can archive events & reset database", checkPermission(president, "archive_events"));
  assert("president can view system audit logs", checkPermission(president, "view_audit_logs"));

  // 4. Finance Lead (Finance Role)
  console.log("\n--- 4. Testing Finance Lead (finance.lead@genai.community) ---");
  const financeLead = getProfile("finance.lead@genai.community");
  assert("finance.lead is NOT in Top-6 Admin", !isTop6Admin(financeLead.role, financeLead.roles));
  assert("finance.lead CAN approve payments", checkPermission(financeLead, "approve_payments"));
  assert("finance.lead CAN manage registrations", checkPermission(financeLead, "manage_registrations"));
  assert("finance.lead CAN export registration data", checkPermission(financeLead, "export_data"));
  assert("finance.lead BLOCKED from managing staff members", !checkPermission(financeLead, "manage_members"));
  assert("finance.lead BLOCKED from assigning roles", !checkPermission(financeLead, "assign_roles"));
  assert("finance.lead BLOCKED from event archival reset", !checkPermission(financeLead, "archive_events"));
  assert("finance.lead BLOCKED from viewing audit logs", !checkPermission(financeLead, "view_audit_logs"));

  // 5. Event Lead (Event Management)
  console.log("\n--- 5. Testing Event Lead (event.lead@genai.community) ---");
  const eventLead = getProfile("event.lead@genai.community");
  assert("event.lead is NOT in Top-6 Admin", !isTop6Admin(eventLead.role, eventLead.roles));
  assert("event.lead CAN manage attendance & scan tickets", checkPermission(eventLead, "manage_attendance"));
  assert("event.lead CAN manage events", checkPermission(eventLead, "manage_events"));
  assert("event.lead BLOCKED from approving payments", !checkPermission(eventLead, "approve_payments"));
  assert("event.lead BLOCKED from managing staff roles", !checkPermission(eventLead, "manage_members"));
  assert("event.lead BLOCKED from event archival reset", !checkPermission(eventLead, "archive_events"));

  // 6. Core Member (Scanner & Volunteer)
  console.log("\n--- 6. Testing Core Member (aiml.coremember.001@genai.community) ---");
  const coreMember = getProfile("aiml.coremember.001@genai.community");
  assert("core member is NOT in Top-6 Admin", !isTop6Admin(coreMember.role, coreMember.roles));
  assert("core member CAN scan attendee QR tickets", checkPermission(coreMember, "manage_attendance"));
  assert("core member BLOCKED from approving payments", !checkPermission(coreMember, "approve_payments"));
  assert("core member BLOCKED from managing staff roles", !checkPermission(coreMember, "manage_members"));
  assert("core member BLOCKED from event archival reset", !checkPermission(coreMember, "archive_events"));
  assert("core member BLOCKED from viewing audit logs", !checkPermission(coreMember, "view_audit_logs"));

  console.log("\n============================================================");
  console.log(`RBAC Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================");
}

runRBACVerification();
