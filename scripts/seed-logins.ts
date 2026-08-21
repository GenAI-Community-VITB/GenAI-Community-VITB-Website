import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEFAULT_PASSWORD = "GenAICommunity@2026-27";

export interface MemberRosterItem {
  email: string;
  fullName: string;
  assignedToName: string;
  primaryRole: string; // 'president', 'vice_president', 'aiml_lead', 'technical_lead', 'finance', 'volunteer'
  team: string;
  position: string;
}

export const ROSTER_2026: MemberRosterItem[] = [
  // ── 1. PANEL (8) ──
  {
    email: "president@genai.community",
    fullName: "Club President",
    assignedToName: "Harshvardhan Om",
    primaryRole: "president",
    team: "panel",
    position: "president",
  },
  {
    email: "vice.president@genai.community",
    fullName: "Vice President",
    assignedToName: "Akshita Singh",
    primaryRole: "vice_president",
    team: "panel",
    position: "vice_president",
  },
  {
    email: "gen.sec.provisional@genai.community",
    fullName: "General Secretary (Provisional)",
    assignedToName: "Anuj Srivastava",
    primaryRole: "volunteer",
    team: "panel",
    position: "general_secretary_provisional",
  },
  {
    email: "general.secretary@genai.community",
    fullName: "General Secretary",
    assignedToName: "Aditya Mishra",
    primaryRole: "volunteer",
    team: "panel",
    position: "general_secretary",
  },
  {
    email: "joint.secretary@genai.community",
    fullName: "Joint Secretary",
    assignedToName: "Anvi Vajpayee",
    primaryRole: "volunteer",
    team: "panel",
    position: "joint_secretary",
  },
  {
    email: "assistant.secretary@genai.community",
    fullName: "Assistant Secretary",
    assignedToName: "Archita Shukla",
    primaryRole: "volunteer",
    team: "panel",
    position: "assistant_secretary",
  },
  {
    email: "student.coord.001@genai.community",
    fullName: "Student Coordinator 01",
    assignedToName: "Ishani Verma",
    primaryRole: "volunteer",
    team: "panel",
    position: "student_coordinator",
  },
  {
    email: "student.coord.002@genai.community",
    fullName: "Student Coordinator 02",
    assignedToName: "Prince Agrawal",
    primaryRole: "volunteer",
    team: "panel",
    position: "student_coordinator",
  },

  // ── 2. HR TEAM (4) ──
  {
    email: "hr.lead@genai.community",
    fullName: "HR Lead",
    assignedToName: "Amritanshu Gupta",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "lead",
  },
  {
    email: "hr.co.lead@genai.community",
    fullName: "HR Co-Lead",
    assignedToName: "Srishti Manav",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "co_lead",
  },
  {
    email: "hr.coremember.001@genai.community",
    fullName: "HR Core Member 01",
    assignedToName: "Nilansh Chauhan",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "core_member",
  },
  {
    email: "hr.coremember.002@genai.community",
    fullName: "HR Core Member 02",
    assignedToName: "Aashka Swaroop",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "core_member",
  },

  // ── 3. EVENT MANAGEMENT (4) ──
  {
    email: "event.lead@genai.community",
    fullName: "Event Management Lead",
    assignedToName: "Priyansh Upadhyay",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "lead",
  },
  {
    email: "event.co.lead@genai.community",
    fullName: "Event Management Co-Lead",
    assignedToName: "Anya Singh",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "co_lead",
  },
  {
    email: "event.coremember.001@genai.community",
    fullName: "Event Core Member 01",
    assignedToName: "Shikha Singh",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "core_member",
  },
  {
    email: "event.coremember.002@genai.community",
    fullName: "Event Core Member 02",
    assignedToName: "Shaurya Tyagi",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "core_member",
  },

  // ── 4. DESIGN TEAM (3) ──
  {
    email: "design.lead@genai.community",
    fullName: "Design Lead",
    assignedToName: "Agrim Mathur",
    primaryRole: "volunteer",
    team: "design_team",
    position: "lead",
  },
  {
    email: "design.co.lead@genai.community",
    fullName: "Design Co-Lead",
    assignedToName: "Kushagra Nigam",
    primaryRole: "volunteer",
    team: "design_team",
    position: "co_lead",
  },
  {
    email: "design.coremember.001@genai.community",
    fullName: "Design Core Member 01",
    assignedToName: "Ameeshi",
    primaryRole: "volunteer",
    team: "design_team",
    position: "core_member",
  },

  // ── 5. AI/ML & INNOVATION TEAM (6) ──
  {
    email: "aiml.lead@genai.community",
    fullName: "AI/ML Lead",
    assignedToName: "Lakshya Kant",
    primaryRole: "aiml_lead", // Top-6 Super Admin
    team: "aiml_innovation_team",
    position: "lead",
  },
  {
    email: "aiml.co.lead@genai.community",
    fullName: "AI/ML Co-Lead",
    assignedToName: "Aaditya Agarwal",
    primaryRole: "aiml_co_lead", // Top-6 Super Admin
    team: "aiml_innovation_team",
    position: "co_lead",
  },
  {
    email: "aiml.coremember.001@genai.community",
    fullName: "AI/ML Core Member 01",
    assignedToName: "Rachit Singh",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "aiml.coremember.002@genai.community",
    fullName: "AI/ML Core Member 02",
    assignedToName: "Suhani Boxi",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "aiml.coremember.003@genai.community",
    fullName: "AI/ML Core Member 03",
    assignedToName: "Sargam Ghagre",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "aiml.coremember.004@genai.community",
    fullName: "AI/ML Core Member 04",
    assignedToName: "Aditya Verma",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },

  // ── 6. SOCIAL MEDIA TEAM (6) ──
  {
    email: "social.lead@genai.community",
    fullName: "Social Media Lead",
    assignedToName: "Jharna Gupta",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "lead",
  },
  {
    email: "social.co.lead@genai.community",
    fullName: "Social Media Co-Lead",
    assignedToName: "Sakcham Shaw",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "co_lead",
  },
  {
    email: "social.coremember.001@genai.community",
    fullName: "Social Media Core Member 01",
    assignedToName: "Arpan Akar",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "social.coremember.002@genai.community",
    fullName: "Social Media Core Member 02",
    assignedToName: "Ayesha Raza",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "social.coremember.003@genai.community",
    fullName: "Social Media Core Member 03",
    assignedToName: "Sanidhya Raj",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "social.coremember.004@genai.community",
    fullName: "Social Media Core Member 04",
    assignedToName: "Priyanshu Sinha",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },

  // ── 7. PR & OUTREACH TEAM (7) ──
  {
    email: "pr.lead@genai.community",
    fullName: "PR & Outreach Lead",
    assignedToName: "Shashwat Mishra",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "lead",
  },
  {
    email: "pr.co.lead@genai.community",
    fullName: "PR & Outreach Co-Lead",
    assignedToName: "Drishti Pandey",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "co_lead",
  },
  {
    email: "pr.coremember.001@genai.community",
    fullName: "PR & Outreach Core Member 01",
    assignedToName: "Debasmita Ghosh",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "pr.coremember.002@genai.community",
    fullName: "PR & Outreach Core Member 02",
    assignedToName: "Palak Priya",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "pr.coremember.003@genai.community",
    fullName: "PR & Outreach Core Member 03",
    assignedToName: "Saanvi Mittal",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "pr.coremember.004@genai.community",
    fullName: "PR & Outreach Core Member 04",
    assignedToName: "Anjali Pandey",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "pr.coremember.005@genai.community",
    fullName: "PR & Outreach Core Member 05",
    assignedToName: "Pushkar Banjara",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },

  // ── 8. TECHNICAL TEAM (7) ──
  {
    email: "tech.lead@genai.community",
    fullName: "Technical Lead",
    assignedToName: "Abhinav Kumar",
    primaryRole: "technical_lead", // Top-6 Super Admin
    team: "technical_team",
    position: "lead",
  },
  {
    email: "tech.co.lead@genai.community",
    fullName: "Technical Co-Lead",
    assignedToName: "Swetalina Sarangi",
    primaryRole: "technical_co_lead", // Top-6 Super Admin
    team: "technical_team",
    position: "co_lead",
  },
  {
    email: "tech.coremember.001@genai.community",
    fullName: "Technical Core Member 01",
    assignedToName: "Anushka Bhatnagar",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "tech.coremember.002@genai.community",
    fullName: "Technical Core Member 02",
    assignedToName: "Rishab jain",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "tech.coremember.003@genai.community",
    fullName: "Technical Core Member 03",
    assignedToName: "Aaditi Shrivastava",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "tech.coremember.004@genai.community",
    fullName: "Technical Core Member 04",
    assignedToName: "Nitin Sharma",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "tech.coremember.005@genai.community",
    fullName: "Technical Core Member 05",
    assignedToName: "Nivedita Jain",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },

  // ── 9. CONTENT TEAM (4) ──
  {
    email: "content.lead@genai.community",
    fullName: "Content Lead",
    assignedToName: "Muskan Jha",
    primaryRole: "volunteer",
    team: "content_team",
    position: "lead",
  },
  {
    email: "content.co.lead@genai.community",
    fullName: "Content Co-Lead",
    assignedToName: "Muskan Bhatia",
    primaryRole: "volunteer",
    team: "content_team",
    position: "co_lead",
  },
  {
    email: "content.coremember.001@genai.community",
    fullName: "Content Core Member 01",
    assignedToName: "Kaustubh",
    primaryRole: "volunteer",
    team: "content_team",
    position: "core_member",
  },
  {
    email: "content.coremember.002@genai.community",
    fullName: "Content Core Member 02",
    assignedToName: "Arsh Arun",
    primaryRole: "volunteer",
    team: "content_team",
    position: "core_member",
  },

  // ── 10. FINANCE TEAM (2) ──
  {
    email: "finance.lead@genai.community",
    fullName: "Finance Lead",
    assignedToName: "Finance Lead (Executive)",
    primaryRole: "finance",
    team: "finance_team",
    position: "lead",
  },
  {
    email: "finance.coremember.001@genai.community",
    fullName: "Finance Core Member 01",
    assignedToName: "Finance Core Member",
    primaryRole: "finance",
    team: "finance_team",
    position: "core_member",
  },
];

export async function seedLogins() {
  console.log("============================================================");
  console.log("Seeding Generative AI Community 2026-27 Logins & RBAC");
  console.log(`Domain: @genai.community`);
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`Total accounts to process: ${ROSTER_2026.length}`);
  console.log("============================================================\n");

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const item of ROSTER_2026) {
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === item.email.toLowerCase(),
      );

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: DEFAULT_PASSWORD,
          user_metadata: {
            full_name: item.fullName,
            assigned_to_name: item.assignedToName,
            role: item.primaryRole,
          },
          email_confirm: true,
        });
        updatedCount++;
      } else {
        const { data: newUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email: item.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: item.fullName,
            assigned_to_name: item.assignedToName,
            role: item.primaryRole,
          },
        });

        if (createAuthError || !newUser.user) {
          throw new Error(createAuthError?.message || "Failed to create user");
        }
        userId = newUser.user.id;
        createdCount++;
      }

      // Upsert user_profiles
      const { error: profileError } = await supabase.from("user_profiles").upsert(
        {
          id: userId,
          email: item.email,
          full_name: item.fullName,
          assigned_to_name: item.assignedToName,
          role: item.primaryRole,
          is_active: true,
          is_voided: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (profileError) throw profileError;

      // Upsert member_roles
      try {
        await supabase.from("member_roles").delete().eq("user_id", userId);
        await supabase.from("member_roles").insert({
          user_id: userId,
          team: item.team,
          position: item.position,
        });
      } catch {
        // Table might not exist until master migration SQL is run
      }

      console.log(`✅ [OK] ${item.email.padEnd(38)} -> ${item.assignedToName.padEnd(22)} (${item.fullName})`);
    } catch (err: any) {
      console.error(`❌ [ERROR] ${item.email}:`, err.message || err);
      errorCount++;
    }
  }

  console.log("\n============================================================");
  console.log(`Seeding Complete: ${createdCount} Created, ${updatedCount} Updated, ${errorCount} Errors`);
  console.log("============================================================");
}

if (process.argv[1] && process.argv[1].includes("seed-logins")) {
  seedLogins();
}
