const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Official Master Registration Directory for 2026-27
const MEMBER_REGISTRATIONS = [
  { name: "Harshvardhan Om", reg: "24bce10511", team: "panel", role: "president" },
  { name: "Akshita Singh", reg: "25bce10779", team: "panel", role: "vice_president" },
  { name: "Ishani Verma", reg: "25boe10013", team: "panel", role: "student_coordinator" },
  { name: "Prince Agrawal", reg: "25bai11117", team: "panel", role: "student_coordinator" },
  { name: "Priyansh Upadhyay", reg: "24bcy10117", team: "event_management_team", role: "lead" },
  { name: "Anya Singh", reg: "25bai11254", team: "event_management_team", role: "co_lead" },
  { name: "Shikha Singh", reg: "24bai10244", team: "event_management_team", role: "core_member" },
  { name: "Shaurya Tyagi", reg: "24bce10339", team: "event_management_team", role: "core_member" },
  { name: "Agrim Mathur", reg: "24bcg10060", team: "design_team", role: "lead" },
  { name: "Kushagra Nigam", reg: "25bai11055", team: "design_team", role: "co_lead" },
  { name: "Lakshya Kant", reg: "24bce10549", team: "aiml_innovation_team", role: "lead" },
  { name: "Aaditya Agarwal", reg: "25bai10079", team: "aiml_innovation_team", role: "co_lead" },
  { name: "Rachit Singh", reg: "25bsa10113", team: "aiml_innovation_team", role: "core_member" },
  { name: "Suhani Boxi", reg: "25bai10011", team: "aiml_innovation_team", role: "core_member" },
  { name: "Sargam Ghagre", reg: "24mip10155", team: "aiml_innovation_team", role: "core_member" },
  { name: "Aditya Verma", reg: "24bce10697", team: "aiml_innovation_team", role: "core_member" },
  { name: "Jharna Gupta", reg: "25bai10557", team: "social_media_team", role: "lead" },
  { name: "Sakcham Shaw", reg: "25mei10005", team: "social_media_team", role: "co_lead" },
  { name: "Arpan Akar", reg: "25bai10112", team: "social_media_team", role: "core_member" },
  { name: "Ayesha Raza", reg: "25bai10998", team: "social_media_team", role: "core_member" },
  { name: "Sanidhya Raj", reg: "24bai10494", team: "social_media_team", role: "core_member" },
  { name: "Priyanshu Sinha", reg: "25bce10710", team: "social_media_team", role: "core_member" },
  { name: "Shashwat Mishra", reg: "25bai10233", team: "pr_outreach_team", role: "lead" },
  { name: "Drishti Pandey", reg: "25boe10138", team: "pr_outreach_team", role: "co_lead" },
  { name: "Debasmita Ghosh", reg: "25boe10075", team: "pr_outreach_team", role: "core_member" },
  { name: "Palak Priya", reg: "25bhi10116", team: "pr_outreach_team", role: "core_member" },
  { name: "Saanvi Mittal", reg: "25bce10473", team: "pr_outreach_team", role: "core_member" },
  { name: "Anjali Pandey", reg: "25bai10296", team: "pr_outreach_team", role: "core_member" },
  { name: "Pushkar Banjara", reg: "25bet10028", team: "pr_outreach_team", role: "core_member" },
  { name: "Abhinav Kumar", reg: "24bsa10110", team: "technical_team", role: "lead" },
  { name: "Swetalina Sarangi", reg: "24bce10419", team: "technical_team", role: "co_lead" },
  { name: "Anushka Bhatnagar", reg: "25bce10312", team: "technical_team", role: "core_member" },
  { name: "Rishab jain", reg: "25bce10989", team: "technical_team", role: "core_member" },
  { name: "Aaditi Shrivastava", reg: "25bcy10019", team: "technical_team", role: "core_member" },
  { name: "Nitin Sharma", reg: "25bai11122", team: "technical_team", role: "core_member" },
  { name: "Nivedita Jain", reg: "25mim10038", team: "technical_team", role: "core_member" },
  { name: "Muskan Jha", reg: "25bce11431", team: "content_team", role: "lead" },
  { name: "Muskan Bhatia", reg: "25bai10064", team: "content_team", role: "co_lead" },
  { name: "Kaustubh", reg: "25bce10722", team: "content_team", role: "core_member" },
  { name: "Arsh Arun", reg: "25bai10482", team: "content_team", role: "core_member" },
];

function deriveAuthenticEmail(fullName, regNo) {
  if (!fullName || !regNo) return null;
  const firstName = fullName.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanReg = regNo.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!firstName || !cleanReg) return null;
  return `${firstName}.${cleanReg}@vitbhopal.ac.in`;
}

async function populateMemberEmails() {
  console.log("================================================================================");
  console.log("⚡ POPULATING ALL CLUB MEMBER EMAILS: firstname.regno@vitbhopal.ac.in");
  console.log("================================================================================\n");

  const { data: profiles, error } = await supabase.from("user_profiles").select("*");
  if (error) {
    console.error("Error fetching user_profiles:", error.message);
    return;
  }

  console.log(`Found ${profiles.length} records in user_profiles table.`);

  let updatedCount = 0;
  let nulledCount = 0;

  for (const profile of profiles) {
    const assignedName = profile.assigned_to_name || profile.full_name || "";
    const regMatch = MEMBER_REGISTRATIONS.find(
      (m) =>
        m.name.toLowerCase() === assignedName.toLowerCase() ||
        assignedName.toLowerCase().includes(m.name.toLowerCase()) ||
        (profile.email && profile.email.toLowerCase().includes(m.reg))
    );

    let targetEmail = null;
    if (regMatch && regMatch.reg) {
      targetEmail = deriveAuthenticEmail(regMatch.name, regMatch.reg);
    } else if (profile.registration_no) {
      targetEmail = deriveAuthenticEmail(assignedName, profile.registration_no);
    } else if (profile.email && profile.email.endsWith("@vitbhopal.ac.in") && /\d+[a-z]+\d+/i.test(profile.email)) {
      targetEmail = profile.email.toLowerCase().trim();
    }

    // Only update if email is genuine vitbhopal.ac.in with reg no, else NULL out dummy @genai.community
    if (targetEmail) {
      const { error: updateErr } = await supabase
        .from("user_profiles")
        .update({
          email: targetEmail,
        })
        .eq("id", profile.id);

      if (!updateErr) {
        console.log(` [✓ UPDATED] ${assignedName.padEnd(25)} -> ${targetEmail}`);
        updatedCount++;
      } else {
        console.error(` [✗ ERROR] ${assignedName}:`, updateErr.message);
      }
    } else {
      // Null out invalid/dummy emails
      const { error: nullErr } = await supabase
        .from("user_profiles")
        .update({
          email: null,
        })
        .eq("id", profile.id);

      if (!nullErr) {
        console.log(` [ℹ LEAVE BLANK] ${assignedName.padEnd(25)} (No registration number present)`);
        nulledCount++;
      }
    }
  }

  console.log("\n================================================================================");
  console.log(` 📊 SUMMARY: ${updatedCount} Updated with firstname.regno@vitbhopal.ac.in | ${nulledCount} Left Blank`);
  console.log("================================================================================\n");
}

populateMemberEmails().catch((err) => {
  console.error("Execution failed:", err);
});
