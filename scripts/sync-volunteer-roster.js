/**
 * Sync 50 Club Members with user_profiles and member_roles in Supabase
 * Ensures all 50 members are active in the Volunteer Assignment Roster.
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function syncRoster() {
  console.log("🔄 Syncing 50 members into user_profiles & member_roles...");

  const { data: members, error: memErr } = await supabase
    .from("members")
    .select("id, name, role, position, official_email, team_id, teams(id, name, slug)");

  if (memErr || !members) {
    console.error("❌ Failed to fetch members:", memErr?.message);
    return;
  }

  console.log(`Found ${members.length} members in the members table.`);

  const { data: existingProfiles } = await supabase.from("user_profiles").select("*");
  const profilesMap = new Map();
  (existingProfiles || []).forEach((p) => {
    if (p.email) profilesMap.set(p.email.toLowerCase(), p);
    if (p.assigned_to_name) profilesMap.set(p.assigned_to_name.toLowerCase(), p);
  });

  let updatedCount = 0;
  let createdCount = 0;

  for (const m of members) {
    const email = (m.official_email || `${m.name.toLowerCase().replace(/\s+/g, ".")}@vitbhopal.ac.in`).toLowerCase();
    let profile = profilesMap.get(email) || profilesMap.get(m.name.toLowerCase());

    if (profile) {
      // Update existing profile to ensure it is active and has correct student name and email
      const { error: updErr } = await supabase
        .from("user_profiles")
        .update({
          email: email,
          assigned_to_name: m.name,
          full_name: m.name,
          role: m.role || "core_member",
          is_active: true,
          is_voided: false,
        })
        .eq("id", profile.id);

      if (updErr) {
        console.error(`❌ Failed to update profile for ${m.name}:`, updErr.message);
      } else {
        updatedCount++;
        // Sync member_roles
        const teamSlug = m.teams?.slug || "general";
        try {
          await supabase.from("member_roles").upsert(
            {
              user_id: profile.id,
              team: teamSlug,
              position: m.position || m.role || "Core Member",
            }
          );
        } catch {}
      }
    } else {
      // Insert new profile
      const newId = crypto.randomUUID();
      const { error: insErr } = await supabase
        .from("user_profiles")
        .insert([
          {
            id: newId,
            email: email,
            assigned_to_name: m.name,
            full_name: m.name,
            role: m.role || "core_member",
            is_active: true,
            is_voided: false,
          },
        ]);

      if (insErr) {
        console.error(`❌ Failed to create profile for ${m.name}:`, insErr.message);
      } else {
        createdCount++;
        const teamSlug = m.teams?.slug || "general";
        try {
          await supabase.from("member_roles").insert([
            {
              user_id: newId,
              team: teamSlug,
              position: m.position || m.role || "Core Member",
            },
          ]);
        } catch {}
      }
    }
  }

  console.log(`\n✅ Summary: Updated ${updatedCount} profiles, Created ${createdCount} profiles.`);

  // Verify total active profiles
  const { data: activeProfiles, error: actErr } = await supabase
    .from("user_profiles")
    .select("id, email, assigned_to_name, is_active, is_voided, roles:member_roles(team, position)")
    .eq("is_active", true)
    .eq("is_voided", false);

  if (actErr) {
    console.error("❌ Verification failed:", actErr.message);
  } else {
    console.log(`🎉 Total Active & Non-Voided Profiles in Roster: ${activeProfiles.length}`);
    activeProfiles.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.assigned_to_name} (${p.email}) - Roles: ${p.roles?.length || 0}`);
    });
  }
}

syncRoster();
