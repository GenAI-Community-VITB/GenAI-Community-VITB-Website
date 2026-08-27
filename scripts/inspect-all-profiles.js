const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectProfiles() {
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, assigned_to_name, role, is_active, is_voided")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Total user_profiles rows: ${profiles.length}`);
  profiles.forEach((p, i) => {
    console.log(
      `[${i + 1}] ID: ${p.id} | Email: ${p.email} | Name: ${p.assigned_to_name || p.full_name} | Role: ${p.role} | Active: ${p.is_active}`
    );
  });
}

inspectProfiles();
