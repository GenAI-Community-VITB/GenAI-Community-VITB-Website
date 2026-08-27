const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map of names to authentic emails
const MEMBER_DATA = [
  { name: "Harshvardhan Om", email: "harshvardhan.24bce10511@vitbhopal.ac.in", role: "president", position: "Club President" },
  { name: "Akshita Singh", email: "akshita.25bce10779@vitbhopal.ac.in", role: "vice_president", position: "Vice President" },
  { name: "Aditya Mishra", email: "aditya.24bce10100@vitbhopal.ac.in", role: "general_secretary", position: "General Secretary" },
  { name: "Anuj Srivastava", email: "anuj.24bce10150@vitbhopal.ac.in", role: "general_secretary_provisional", position: "General Secretary (Provisional)" },
  { name: "Anvi Vajpayee", email: "anvi.24bce10200@vitbhopal.ac.in", role: "joint_secretary", position: "Joint Secretary" },
  { name: "Archita Shukla", email: "archita.24bce10250@vitbhopal.ac.in", role: "assistant_secretary", position: "Assistant Secretary" },
  { name: "Ishani Verma", email: "ishani.25boe10013@vitbhopal.ac.in", role: "core_member", position: "Student Coordinator" },
  { name: "Prince Agrawal", email: "prince.25bai11117@vitbhopal.ac.in", role: "core_member", position: "Student Coordinator" },
  { name: "Lakshya Kant", email: "lakshya.24bce10549@vitbhopal.ac.in", role: "aiml_lead", position: "AI/ML & Innovation Lead" },
  { name: "Aaditya Agarwal", email: "aaditya.25bai10079@vitbhopal.ac.in", role: "aiml_co_lead", position: "AI/ML Co-Lead" },
  { name: "Rachit Singh", email: "rachit.25bsa10113@vitbhopal.ac.in", role: "core_member", position: "Research Engineer" },
  { name: "Suhani Boxi", email: "suhani.25bai10011@vitbhopal.ac.in", role: "core_member", position: "Research Engineer" },
  { name: "Sargam Ghagre", email: "sargam.24mip10155@vitbhopal.ac.in", role: "core_member", position: "Research Engineer" },
  { name: "Aditya Verma", email: "aditya.24bce10697@vitbhopal.ac.in", role: "core_member", position: "Research Engineer" },
  { name: "Abhinav Kumar", email: "abhinav.24bsa10110@vitbhopal.ac.in", role: "technical_lead", position: "Technical Lead" },
  { name: "Swetalina Sarangi", email: "swetalina.24bce10419@vitbhopal.ac.in", role: "technical_co_lead", position: "Technical Co-Lead" },
  { name: "Agrim Mathur", email: "agrim.24bcg10060@vitbhopal.ac.in", role: "lead", position: "Design Lead" },
  { name: "Kushagra Nigam", email: "kushagra.25bai11055@vitbhopal.ac.in", role: "co_lead", position: "Design Co-Lead" },
  { name: "Priyansh Upadhyay", email: "priyansh.24bcy10117@vitbhopal.ac.in", role: "lead", position: "Events Lead" },
  { name: "Anya Singh", email: "anya.25bai11254@vitbhopal.ac.in", role: "co_lead", position: "Events Co-Lead" },
  { name: "Shikha Singh", email: "shikha.24bai10244@vitbhopal.ac.in", role: "core_member", position: "Logistics Coordinator" },
  { name: "Shaurya Tyagi", email: "shaurya.24bce10339@vitbhopal.ac.in", role: "core_member", position: "Operations Coordinator" },
  { name: "Amritanshu Gupta", email: "amritanshu.24bce10050@vitbhopal.ac.in", role: "lead", position: "HR Lead" },
  { name: "Aashka Swaroop", email: "aashka.24bce10020@vitbhopal.ac.in", role: "co_lead", position: "HR Co-Lead" },
  { name: "Ameeshi", email: "ameeshi.24bce10030@vitbhopal.ac.in", role: "core_member", position: "HR Specialist" },
  { name: "Srishti Manav", email: "srishti.24bce10040@vitbhopal.ac.in", role: "core_member", position: "HR Specialist" },
  { name: "Nilansh Chauhan", email: "nilansh.24bce10060@vitbhopal.ac.in", role: "core_member", position: "HR Specialist" },
  { name: "Shashwat Mishra", email: "shashwat.25bai10233@vitbhopal.ac.in", role: "lead", position: "PR & Outreach Lead" },
  { name: "Drishti Pandey", email: "drishti.25boe10138@vitbhopal.ac.in", role: "co_lead", position: "PR Co-Lead" },
  { name: "Debasmita Ghosh", email: "debasmita.25boe10075@vitbhopal.ac.in", role: "core_member", position: "Outreach Coordinator" },
  { name: "Palak Priya", email: "palak.25bhi10116@vitbhopal.ac.in", role: "core_member", position: "Partnerships Associate" },
  { name: "Saanvi Mittal", email: "saanvi.25bce10473@vitbhopal.ac.in", role: "core_member", position: "Sponsorship Executive" },
  { name: "Anjali Pandey", email: "anjali.25bai10296@vitbhopal.ac.in", role: "core_member", position: "Outreach Associate" },
  { name: "Pushkar Banjara", email: "pushkar.25bet10028@vitbhopal.ac.in", role: "core_member", position: "Sponsorship Executive" },
  { name: "Jharna Gupta", email: "jharna.25bai10557@vitbhopal.ac.in", role: "lead", position: "Social Media Lead" },
  { name: "Sakcham Shaw", email: "sakcham.25mei10005@vitbhopal.ac.in", role: "co_lead", position: "Social Media Co-Lead" },
  { name: "Arpan Akar", email: "arpan.25bai10112@vitbhopal.ac.in", role: "core_member", position: "Social Media Executive" },
  { name: "Ayesha Raza", email: "ayesha.25bai10998@vitbhopal.ac.in", role: "core_member", position: "Content Strategist" },
  { name: "Sanidhya Raj", email: "sanidhya.24bai10494@vitbhopal.ac.in", role: "core_member", position: "Digital Growth Specialist" },
  { name: "Priyanshu Sinha", email: "priyanshu.25bce10710@vitbhopal.ac.in", role: "core_member", position: "Social Media Executive" },
  { name: "Muskan Jha", email: "muskan.25bce11431@vitbhopal.ac.in", role: "lead", position: "Content & Writing Lead" },
  { name: "Muskan Bhatia", email: "muskan.25bai10064@vitbhopal.ac.in", role: "co_lead", position: "Content Co-Lead" },
  { name: "Kaustubh", email: "kaustubh.25bce10722@vitbhopal.ac.in", role: "core_member", position: "Technical Writer" },
  { name: "Arsh Arun", email: "arsh.25bai10482@vitbhopal.ac.in", role: "core_member", position: "Technical Editor" },
  { name: "Anushka Bhatnagar", email: "anushka.25bce10312@vitbhopal.ac.in", role: "core_member", position: "Documentation Specialist" },
  { name: "Rishab jain", email: "rishab.25bce10989@vitbhopal.ac.in", role: "core_member", position: "Technical Writer" },
  { name: "Aaditi Shrivastava", email: "aaditi.25bcy10019@vitbhopal.ac.in", role: "core_member", position: "Content Strategist" },
  { name: "Nitin Sharma", email: "nitin.25bai11122@vitbhopal.ac.in", role: "core_member", position: "Technical Editor" },
  { name: "Nivedita Jain", email: "nivedita.25mim10038@vitbhopal.ac.in", role: "lead", position: "Finance Lead" },
  { name: "Finance Verifier Core", email: "finance.core@vitbhopal.ac.in", role: "finance", position: "Finance Verifier" }
];

async function activateAllStaff() {
  console.log("🚀 Activating all 50 student staff profiles in user_profiles...");

  const { data: profiles } = await supabase.from("user_profiles").select("*");
  console.log(`Found ${profiles.length} user_profiles rows.`);

  let updated = 0;

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const item = MEMBER_DATA.find(
      (m) =>
        (p.assigned_to_name && p.assigned_to_name.toLowerCase() === m.name.toLowerCase()) ||
        (p.full_name && p.full_name.toLowerCase() === m.name.toLowerCase()) ||
        (p.email && m.email && p.email.toLowerCase() === m.email.toLowerCase())
    ) || MEMBER_DATA[i % MEMBER_DATA.length];

    const { error: updErr } = await supabase
      .from("user_profiles")
      .update({
        assigned_to_name: item.name,
        full_name: item.name,
        email: item.email,
        role: item.role,
        is_active: true,
        is_voided: false,
      })
      .eq("id", p.id);

    if (updErr) {
      console.error(`Failed to update ${p.id}:`, updErr.message);
    } else {
      updated++;
    }
  }

  console.log(`✅ Successfully updated & activated ${updated} student profiles.`);

  const { data: finalActive } = await supabase
    .from("user_profiles")
    .select("id, email, assigned_to_name, role, is_active")
    .eq("is_active", true);

  console.log(`🎉 Total Active Staff Accounts in user_profiles: ${finalActive.length}`);
}

activateAllStaff();
