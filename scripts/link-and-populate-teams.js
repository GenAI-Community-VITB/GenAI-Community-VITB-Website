/**
 * Link and Populate Teams & Members in Supabase
 * Establishes complete foreign-key links between `teams` and `members` tables.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const TEAMS_DATA = [
  {
    name: "Executive Leadership Panel",
    slug: "executive-panel",
    description: "Spearheading community vision, strategic partnerships, and multi-vertical technical innovation.",
    members: [
      {
        name: "Harshvardhan Om",
        role: "president",
        position: "Club President",
        official_email: "harshvardhan.24bce10511@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Akshita Singh",
        role: "vice_president",
        position: "Vice President",
        official_email: "akshita.25bce10779@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aditya Mishra",
        role: "general_secretary",
        position: "General Secretary",
        official_email: "aditya.24bce10100@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Anuj Srivastava",
        role: "general_secretary_provisional",
        position: "General Secretary (Provisional)",
        official_email: "anuj.24bce10150@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Anvi Vajpayee",
        role: "joint_secretary",
        position: "Joint Secretary",
        official_email: "anvi.24bce10200@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Archita Shukla",
        role: "assistant_secretary",
        position: "Assistant Secretary",
        official_email: "archita.24bce10250@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "AI / ML & Innovation Division",
    slug: "aiml-research",
    description: "Developing autonomous agent frameworks, multimodal LLM pipelines, and neural network architectures.",
    members: [
      {
        name: "Lakshya Kant",
        role: "aiml_lead",
        position: "AI/ML & Innovation Lead",
        official_email: "lakshya.24bce10549@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Shreesh",
        role: "aiml_co_lead",
        position: "AI/ML Co-Lead",
        official_email: "shreesh.24bce10600@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aman Shakya",
        role: "core_member",
        position: "Research Engineer",
        official_email: "aman.24bce10300@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Anish Pandey",
        role: "core_member",
        position: "Research Engineer",
        official_email: "anish.24bce10350@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Tanuj Sharma",
        role: "core_member",
        position: "Research Engineer",
        official_email: "tanuj.24bce10700@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Technical & Software Engineering",
    slug: "technical-development",
    description: "Architecting high-scale web platforms, cloud infrastructure, and real-time event microservices.",
    members: [
      {
        name: "Abhinav Kumar",
        role: "technical_lead",
        position: "Technical Lead",
        official_email: "abhinav.24bsa10110@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Ankit Kumar Singh",
        role: "technical_co_lead",
        position: "Technical Co-Lead",
        official_email: "ankit.24bce10400@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Anirudh Sharma",
        role: "core_member",
        position: "Full Stack Engineer",
        official_email: "anirudh.24bce10450@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Avaneesh Kumar",
        role: "core_member",
        position: "Cloud & Systems Engineer",
        official_email: "avaneesh.24bce10500@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Divyansh Raj",
        role: "core_member",
        position: "Full Stack Engineer",
        official_email: "divyansh.24bce10550@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Prakhar Soni",
        role: "core_member",
        position: "Systems Engineer",
        official_email: "prakhar.24bce10650@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Design & Creative Media",
    slug: "design-media",
    description: "Crafting modern cyberpunk visuals, user interfaces, branding assets, and motion graphics.",
    members: [
      {
        name: "Agrim Mathur",
        role: "lead",
        position: "Design Lead",
        official_email: "agrim.24bcg10060@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Harshita Raj",
        role: "co_lead",
        position: "Design Co-Lead",
        official_email: "harshita.24bcg10100@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aadya Trivedi",
        role: "core_member",
        position: "Visual Designer",
        official_email: "aadya.24bcg10010@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aditi Saini",
        role: "core_member",
        position: "UI/UX Designer",
        official_email: "aditi.24bcg10020@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Pratham Rai",
        role: "core_member",
        position: "Motion Graphics Designer",
        official_email: "pratham.24bcg10150@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Event Management & Operations",
    slug: "event-management",
    description: "Orchestrating hackathons, technical workshops, venue operations, and guest speaker symposiums.",
    members: [
      {
        name: "Priyansh Upadhyay",
        role: "lead",
        position: "Events Lead",
        official_email: "priyansh.24bcy10117@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Sneha Bhowmik",
        role: "co_lead",
        position: "Events Co-Lead",
        official_email: "sneha.24bcy10150@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Devanshu Saxena",
        role: "core_member",
        position: "Logistics Coordinator",
        official_email: "devanshu.24bcy10050@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Divyanshi Rai",
        role: "core_member",
        position: "Operations Coordinator",
        official_email: "divyanshi.24bcy10080@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Kopal Agrawal",
        role: "core_member",
        position: "Events Coordinator",
        official_email: "kopal.24bcy10090@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Nilesh Ranjan",
        role: "core_member",
        position: "Operations Lead Coordinator",
        official_email: "nilesh.24bcy10100@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Human Resources & Talent Development",
    slug: "human-resources",
    description: "Driving community talent acquisition, internal mentorship tracks, and performance appraisals.",
    members: [
      {
        name: "Amritanshu Gupta",
        role: "lead",
        position: "HR Lead",
        official_email: "amritanshu.24bce10050@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Vansh Gupta",
        role: "co_lead",
        position: "HR Co-Lead",
        official_email: "vansh.24bce10800@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Abhishek Singh",
        role: "core_member",
        position: "HR Specialist",
        official_email: "abhishek.24bce10010@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Animesh Singh",
        role: "core_member",
        position: "HR Specialist",
        official_email: "animesh.24bce10080@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aryan Gupta",
        role: "core_member",
        position: "HR Specialist",
        official_email: "aryan.24bce10120@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "PR, Outreach & Sponsorships",
    slug: "pr-outreach",
    description: "Establishing university collaborations, corporate sponsorships, and ecosystem partnerships.",
    members: [
      {
        name: "Shashwat Mishra",
        role: "lead",
        position: "PR & Outreach Lead",
        official_email: "shashwat.25bai10233@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Nitya Pandey",
        role: "co_lead",
        position: "PR Co-Lead",
        official_email: "nitya.25bai10200@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aaditri Verma",
        role: "core_member",
        position: "Outreach Coordinator",
        official_email: "aaditri.25bai10010@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Astitva Verma",
        role: "core_member",
        position: "Partnerships Associate",
        official_email: "astitva.25bai10050@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Prajjawal Shrivastava",
        role: "core_member",
        position: "Sponsorship Executive",
        official_email: "prajjawal.25bai10300@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Social Media & Growth Marketing",
    slug: "social-media",
    description: "Managing LinkedIn technical feeds, digital outreach campaigns, and student engagement funnels.",
    members: [
      {
        name: "Jharna Gupta",
        role: "lead",
        position: "Social Media Lead",
        official_email: "jharna.25bai10557@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Sakcham Shaw",
        role: "co_lead",
        position: "Social Media Co-Lead",
        official_email: "sakcham.25mei10005@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aadya Singh",
        role: "core_member",
        position: "Social Media Executive",
        official_email: "aadya.25bai10020@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Ananya",
        role: "core_member",
        position: "Content Strategist",
        official_email: "ananya.25bai10040@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Garvit Agrawal",
        role: "core_member",
        position: "Digital Growth Specialist",
        official_email: "garvit.25bai10100@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Content Strategy & Technical Writing",
    slug: "content-strategy",
    description: "Authoring deep-dive AI engineering blogs, newsletters, release notes, and technical documentation.",
    members: [
      {
        name: "Muskan Jha",
        role: "lead",
        position: "Content & Writing Lead",
        official_email: "muskan.25bce11431@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Pari Singh",
        role: "co_lead",
        position: "Content Co-Lead",
        official_email: "pari.25bce11500@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Aarushi Jain",
        role: "core_member",
        position: "Technical Writer",
        official_email: "aarushi.25bce11010@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Abhinav Srivastava",
        role: "core_member",
        position: "Technical Editor",
        official_email: "abhinav.25bce11050@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Anvesha Garg",
        role: "core_member",
        position: "Documentation Specialist",
        official_email: "anvesha.25bce11100@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
  {
    name: "Finance & Treasury Operations",
    slug: "finance-treasury",
    description: "Managing event ticketing revenues, student payment reconciliations, budget allocations, and audits.",
    members: [
      {
        name: "Manya Jain",
        role: "lead",
        position: "Finance Lead",
        official_email: "manya.24bce10600@vitbhopal.ac.in",
        status: "active",
      },
      {
        name: "Priyal Gupta",
        role: "co_lead",
        position: "Finance Co-Lead",
        official_email: "priyal.24bce10650@vitbhopal.ac.in",
        status: "active",
      },
    ],
  },
];

async function linkAndPopulate() {
  console.log("🔗 Linking & Populating Supabase Teams and Members...");

  // 1. Fetch existing teams or clean up
  const { data: existingTeams } = await supabase.from("teams").select("id, slug");
  if (existingTeams && existingTeams.length > 0) {
    console.log(`Found ${existingTeams.length} existing teams. Cleaning up members first...`);
    await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  let totalTeams = 0;
  let totalMembers = 0;

  for (const teamData of TEAMS_DATA) {
    const { data: teamRecord, error: teamErr } = await supabase
      .from("teams")
      .insert([
        {
          name: teamData.name,
          slug: teamData.slug,
          description: teamData.description,
        },
      ])
      .select()
      .single();

    if (teamErr || !teamRecord) {
      console.error(`❌ Failed to create team ${teamData.name}:`, teamErr?.message);
      continue;
    }

    totalTeams++;
    console.log(`✅ Created Team [${teamRecord.id}]: ${teamRecord.name} (${teamRecord.slug})`);

    const membersToInsert = teamData.members.map((m) => ({
      team_id: teamRecord.id,
      name: m.name,
      role: m.role,
      position: m.position,
      official_email: m.official_email,
      status: m.status,
    }));

    const { data: insertedMembers, error: memErr } = await supabase
      .from("members")
      .insert(membersToInsert)
      .select();

    if (memErr) {
      console.error(`❌ Failed to insert members for team ${teamRecord.name}:`, memErr.message);
    } else {
      totalMembers += (insertedMembers ? insertedMembers.length : 0);
      console.log(`   ↳ Linked ${insertedMembers ? insertedMembers.length : 0} members.`);
    }
  }

  console.log("\n── VERIFICATION JOIN QUERY ──");
  const { data: joinData, error: joinErr } = await supabase
    .from("teams")
    .select("id, name, slug, members(id, name, role, position, official_email)");

  if (joinErr) {
    console.error("❌ Join query failed:", joinErr.message);
  } else {
    console.log(`✅ Successfully queried ${joinData.length} teams with relational foreign-key members!`);
    joinData.forEach((t) => {
      console.log(`   • ${t.name}: ${t.members ? t.members.length : 0} linked members`);
    });
  }

  console.log(`\n🎉 Populated ${totalTeams} Teams and ${totalMembers} Members properly linked in Supabase!`);
}

linkAndPopulate();
