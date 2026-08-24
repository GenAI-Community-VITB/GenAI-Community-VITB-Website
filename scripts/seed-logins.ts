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
  legacyEmails?: string[];
  fullName: string;
  assignedToName: string;
  primaryRole: string; // 'president', 'vice_president', 'aiml_lead', 'technical_lead', 'finance', 'volunteer'
  team: string;
  position: string;
}

export const ROSTER_2026: MemberRosterItem[] = [
  // ── 1. PANEL (8) ──
  {
    email: "harshvardhan.24bce10511@vitbhopal.ac.in",
    legacyEmails: ["president@genai.community"],
    fullName: "Club President",
    assignedToName: "Harshvardhan Om",
    primaryRole: "president",
    team: "panel",
    position: "president",
  },
  {
    email: "akshita.25bce10779@vitbhopal.ac.in",
    legacyEmails: ["vice.president@genai.community"],
    fullName: "Vice President",
    assignedToName: "Akshita Singh",
    primaryRole: "vice_president",
    team: "panel",
    position: "vice_president",
  },
  {
    email: "anuj.gen.sec@vitbhopal.ac.in",
    legacyEmails: ["gen.sec.provisional@genai.community"],
    fullName: "General Secretary (Provisional)",
    assignedToName: "Anuj Srivastava",
    primaryRole: "volunteer",
    team: "panel",
    position: "general_secretary_provisional",
  },
  {
    email: "aditya.gen.sec@vitbhopal.ac.in",
    legacyEmails: ["general.secretary@genai.community"],
    fullName: "General Secretary",
    assignedToName: "Aditya Mishra",
    primaryRole: "volunteer",
    team: "panel",
    position: "general_secretary",
  },
  {
    email: "anvi.joint.sec@vitbhopal.ac.in",
    legacyEmails: ["joint.secretary@genai.community"],
    fullName: "Joint Secretary",
    assignedToName: "Anvi Vajpayee",
    primaryRole: "volunteer",
    team: "panel",
    position: "joint_secretary",
  },
  {
    email: "archita.asst.sec@vitbhopal.ac.in",
    legacyEmails: ["assistant.secretary@genai.community"],
    fullName: "Assistant Secretary",
    assignedToName: "Archita Shukla",
    primaryRole: "volunteer",
    team: "panel",
    position: "assistant_secretary",
  },
  {
    email: "ishani.25boe10013@vitbhopal.ac.in",
    legacyEmails: ["student.coord.001@genai.community"],
    fullName: "Student Coordinator 01",
    assignedToName: "Ishani Verma",
    primaryRole: "volunteer",
    team: "panel",
    position: "student_coordinator",
  },
  {
    email: "prince.25bai11117@vitbhopal.ac.in",
    legacyEmails: ["student.coord.002@genai.community"],
    fullName: "Student Coordinator 02",
    assignedToName: "Prince Agrawal",
    primaryRole: "volunteer",
    team: "panel",
    position: "student_coordinator",
  },

  // ── 2. HR TEAM (4) ──
  {
    email: "amritanshu.hr@vitbhopal.ac.in",
    legacyEmails: ["hr.lead@genai.community"],
    fullName: "HR Lead",
    assignedToName: "Amritanshu Gupta",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "lead",
  },
  {
    email: "srishti.hr@vitbhopal.ac.in",
    legacyEmails: ["hr.co.lead@genai.community"],
    fullName: "HR Co-Lead",
    assignedToName: "Srishti Manav",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "co_lead",
  },
  {
    email: "nilansh.hr@vitbhopal.ac.in",
    legacyEmails: ["hr.coremember.001@genai.community"],
    fullName: "HR Core Member 01",
    assignedToName: "Nilansh Chauhan",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "core_member",
  },
  {
    email: "aashka.hr@vitbhopal.ac.in",
    legacyEmails: ["hr.coremember.002@genai.community"],
    fullName: "HR Core Member 02",
    assignedToName: "Aashka Swaroop",
    primaryRole: "volunteer",
    team: "hr_team",
    position: "core_member",
  },

  // ── 3. EVENT MANAGEMENT (4) ──
  {
    email: "priynash.24bcy10117@vitbhopal.ac.in",
    legacyEmails: ["event.lead@genai.community"],
    fullName: "Event Management Lead",
    assignedToName: "Priyansh Upadhyay",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "lead",
  },
  {
    email: "anya.25bai11254@vitbhopal.ac.in",
    legacyEmails: ["event.co.lead@genai.community"],
    fullName: "Event Management Co-Lead",
    assignedToName: "Anya Singh",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "co_lead",
  },
  {
    email: "shikha.24bai10244@vitbhopal.ac.in",
    legacyEmails: ["event.coremember.001@genai.community"],
    fullName: "Event Core Member 01",
    assignedToName: "Shikha Singh",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "core_member",
  },
  {
    email: "shaurya.24bce10339@vitbhopal.ac.in",
    legacyEmails: ["event.coremember.002@genai.community"],
    fullName: "Event Core Member 02",
    assignedToName: "Shaurya Tyagi",
    primaryRole: "volunteer",
    team: "event_management_team",
    position: "core_member",
  },

  // ── 4. DESIGN TEAM (3) ──
  {
    email: "agrim.24bcg10060@vitbhopal.ac.in",
    legacyEmails: ["design.lead@genai.community"],
    fullName: "Design Lead",
    assignedToName: "Agrim Mathur",
    primaryRole: "volunteer",
    team: "design_team",
    position: "lead",
  },
  {
    email: "kushagra.25bai11055@vitbhopal.ac.in",
    legacyEmails: ["design.co.lead@genai.community"],
    fullName: "Design Co-Lead",
    assignedToName: "Kushagra Nigam",
    primaryRole: "volunteer",
    team: "design_team",
    position: "co_lead",
  },
  {
    email: "ameeshi.design@vitbhopal.ac.in",
    legacyEmails: ["design.coremember.001@genai.community"],
    fullName: "Design Core Member 01",
    assignedToName: "Ameeshi",
    primaryRole: "volunteer",
    team: "design_team",
    position: "core_member",
  },

  // ── 5. AI/ML & INNOVATION TEAM (6) ──
  {
    email: "lakshya.24bce10549@vitbhopal.ac.in",
    legacyEmails: ["aiml.lead@genai.community"],
    fullName: "AI/ML Lead",
    assignedToName: "Lakshya Kant",
    primaryRole: "aiml_lead", // Top-6 Super Admin
    team: "aiml_innovation_team",
    position: "lead",
  },
  {
    email: "aaditya.25bai10079@vitbhopal.ac.in",
    legacyEmails: ["aiml.co.lead@genai.community"],
    fullName: "AI/ML Co-Lead",
    assignedToName: "Aaditya Agarwal",
    primaryRole: "aiml_co_lead", // Top-6 Super Admin
    team: "aiml_innovation_team",
    position: "co_lead",
  },
  {
    email: "rachit.25bsa10113@vitbhopal.ac.in",
    legacyEmails: ["aiml.coremember.001@genai.community"],
    fullName: "AI/ML Core Member 01",
    assignedToName: "Rachit Singh",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "suhani.25bai10011@vitbhopal.ac.in",
    legacyEmails: ["aiml.coremember.002@genai.community"],
    fullName: "AI/ML Core Member 02",
    assignedToName: "Suhani Boxi",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "sargam.24mip10155@vitbhopal.ac.in",
    legacyEmails: ["aiml.coremember.003@genai.community"],
    fullName: "AI/ML Core Member 03",
    assignedToName: "Sargam Ghagre",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },
  {
    email: "aditya.24bce10697@vitbhopal.ac.in",
    legacyEmails: ["aiml.coremember.004@genai.community"],
    fullName: "AI/ML Core Member 04",
    assignedToName: "Aditya Verma",
    primaryRole: "volunteer",
    team: "aiml_innovation_team",
    position: "core_member",
  },

  // ── 6. SOCIAL MEDIA TEAM (6) ──
  {
    email: "jharna.25bai10557@vitbhopal.ac.in",
    legacyEmails: ["social.lead@genai.community"],
    fullName: "Social Media Lead",
    assignedToName: "Jharna Gupta",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "lead",
  },
  {
    email: "sakcham.25mei10005@vitbhopal.ac.in",
    legacyEmails: ["social.co.lead@genai.community"],
    fullName: "Social Media Co-Lead",
    assignedToName: "Sakcham Shaw",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "co_lead",
  },
  {
    email: "arpan.25bai10112@vitbhopal.ac.in",
    legacyEmails: ["social.coremember.001@genai.community"],
    fullName: "Social Media Core Member 01",
    assignedToName: "Arpan Akar",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "ayesha.25bai10998@vitbhopal.ac.in",
    legacyEmails: ["social.coremember.002@genai.community"],
    fullName: "Social Media Core Member 02",
    assignedToName: "Ayesha Raza",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "sanidhya.24bai10494@vitbhopal.ac.in",
    legacyEmails: ["social.coremember.003@genai.community"],
    fullName: "Social Media Core Member 03",
    assignedToName: "Sanidhya Raj",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },
  {
    email: "priyanshu.25bce10710@vitbhopal.ac.in",
    legacyEmails: ["social.coremember.004@genai.community"],
    fullName: "Social Media Core Member 04",
    assignedToName: "Priyanshu Sinha",
    primaryRole: "volunteer",
    team: "social_media_team",
    position: "core_member",
  },

  // ── 7. PR & OUTREACH TEAM (7) ──
  {
    email: "shashwat.25bai10233@vitbhopal.ac.in",
    legacyEmails: ["pr.lead@genai.community"],
    fullName: "PR & Outreach Lead",
    assignedToName: "Shashwat Mishra",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "lead",
  },
  {
    email: "drishti.25boe10138@vitbhopal.ac.in",
    legacyEmails: ["pr.co.lead@genai.community"],
    fullName: "PR & Outreach Co-Lead",
    assignedToName: "Drishti Pandey",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "co_lead",
  },
  {
    email: "debasmita.25boe10075@vitbhopal.ac.in",
    legacyEmails: ["pr.coremember.001@genai.community"],
    fullName: "PR & Outreach Core Member 01",
    assignedToName: "Debasmita Ghosh",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "palak.25bhi10116@vitbhopal.ac.in",
    legacyEmails: ["pr.coremember.002@genai.community"],
    fullName: "PR & Outreach Core Member 02",
    assignedToName: "Palak Priya",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "saanvi.25bce10473@vitbhopal.ac.in",
    legacyEmails: ["pr.coremember.003@genai.community"],
    fullName: "PR & Outreach Core Member 03",
    assignedToName: "Saanvi Mittal",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "anjali.25bai10296@vitbhopal.ac.in",
    legacyEmails: ["pr.coremember.004@genai.community"],
    fullName: "PR & Outreach Core Member 04",
    assignedToName: "Anjali Pandey",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },
  {
    email: "pushkar.25bet10028@vitbhopal.ac.in",
    legacyEmails: ["pr.coremember.005@genai.community"],
    fullName: "PR & Outreach Core Member 05",
    assignedToName: "Pushkar Banjara",
    primaryRole: "volunteer",
    team: "pr_outreach_team",
    position: "core_member",
  },

  // ── 8. TECHNICAL TEAM (7) ──
  {
    email: "abhinav.24bsa10110@vitbhopal.ac.in",
    legacyEmails: ["tech.lead@genai.community"],
    fullName: "Technical Lead",
    assignedToName: "Abhinav Kumar",
    primaryRole: "technical_lead", // Top-6 Super Admin
    team: "technical_team",
    position: "lead",
  },
  {
    email: "swetalina.24bce10419@vitbhopal.ac.in",
    legacyEmails: ["tech.co.lead@genai.community"],
    fullName: "Technical Co-Lead",
    assignedToName: "Swetalina Sarangi",
    primaryRole: "technical_co_lead", // Top-6 Super Admin
    team: "technical_team",
    position: "co_lead",
  },
  {
    email: "anushka.25bce10312@vitbhopal.ac.in",
    legacyEmails: ["tech.coremember.001@genai.community"],
    fullName: "Technical Core Member 01",
    assignedToName: "Anushka Bhatnagar",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "rishab.25bce10989@vitbhopal.ac.in",
    legacyEmails: ["tech.coremember.002@genai.community"],
    fullName: "Technical Core Member 02",
    assignedToName: "Rishab jain",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "aaditi.25bcy10019@vitbhopal.ac.in",
    legacyEmails: ["tech.coremember.003@genai.community"],
    fullName: "Technical Core Member 03",
    assignedToName: "Aaditi Shrivastava",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "nitin.25bai11122@vitbhopal.ac.in",
    legacyEmails: ["tech.coremember.004@genai.community"],
    fullName: "Technical Core Member 04",
    assignedToName: "Nitin Sharma",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },
  {
    email: "nivedita.25mim10038@vitbhopal.ac.in",
    legacyEmails: ["tech.coremember.005@genai.community"],
    fullName: "Technical Core Member 05",
    assignedToName: "Nivedita Jain",
    primaryRole: "volunteer",
    team: "technical_team",
    position: "core_member",
  },

  // ── 9. CONTENT TEAM (4) ──
  {
    email: "muskan.25bce11431@vitbhopal.ac.in",
    legacyEmails: ["content.lead@genai.community"],
    fullName: "Content Lead",
    assignedToName: "Muskan Jha",
    primaryRole: "volunteer",
    team: "content_team",
    position: "lead",
  },
  {
    email: "muskan.25bai10064@vitbhopal.ac.in",
    legacyEmails: ["content.co.lead@genai.community"],
    fullName: "Content Co-Lead",
    assignedToName: "Muskan Bhatia",
    primaryRole: "volunteer",
    team: "content_team",
    position: "co_lead",
  },
  {
    email: "kaustubh.25bce10722@vitbhopal.ac.in",
    legacyEmails: ["content.coremember.001@genai.community"],
    fullName: "Content Core Member 01",
    assignedToName: "Kaustubh",
    primaryRole: "volunteer",
    team: "content_team",
    position: "core_member",
  },
  {
    email: "arsh.25bai10482@vitbhopal.ac.in",
    legacyEmails: ["content.coremember.002@genai.community"],
    fullName: "Content Core Member 02",
    assignedToName: "Arsh Arun",
    primaryRole: "volunteer",
    team: "content_team",
    position: "core_member",
  },

  // ── 10. FINANCE TEAM (2) ──
  {
    email: "finance.lead@vitbhopal.ac.in",
    legacyEmails: ["finance.lead@genai.community"],
    fullName: "Finance Lead",
    assignedToName: "Finance Lead (Executive)",
    primaryRole: "finance",
    team: "finance_team",
    position: "lead",
  },
  {
    email: "finance.core@vitbhopal.ac.in",
    legacyEmails: ["finance.coremember.001@genai.community"],
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
  console.log(`Domain: @vitbhopal.ac.in`);
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`Total accounts to process: ${ROSTER_2026.length}`);
  console.log("============================================================\n");

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // Fetch all existing users once
  const { data: existingUsersRes } = await supabase.auth.admin.listUsers();
  const existingUsers = existingUsersRes?.users || [];

  for (const item of ROSTER_2026) {
    try {
      // Look up existing user by new email, legacy email, or assignedToName in metadata
      const existingUser = existingUsers.find((u) => {
        const uEmail = u.email?.toLowerCase();
        if (uEmail === item.email.toLowerCase()) return true;
        if (item.legacyEmails?.some((leg) => leg.toLowerCase() === uEmail)) return true;
        const metaAssigned = (u.user_metadata?.assigned_to_name || "").toLowerCase();
        const metaFull = (u.user_metadata?.full_name || "").toLowerCase();
        return (
          metaAssigned === item.assignedToName.toLowerCase() ||
          metaFull === item.fullName.toLowerCase()
        );
      });

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        // In-place edit of existing user email and metadata
        await supabase.auth.admin.updateUserById(userId, {
          email: item.email,
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

      // Upsert user_profiles in-place
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
        // Non-fatal if table doesn't exist yet
      }

      console.log(`✅ [OK] ${item.email.padEnd(42)} -> ${item.assignedToName.padEnd(22)} (${item.fullName})`);
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
