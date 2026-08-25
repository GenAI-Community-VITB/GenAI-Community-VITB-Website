import { createClient } from "@supabase/supabase-js";
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

/**
 * Regex matching: firstname.registrationnumber@vitbhopal.ac.in
 * Example valid:
 *   - harshvardhan.24bce10511@vitbhopal.ac.in
 *   - akshita.25bce10779@vitbhopal.ac.in
 *   - prince.25bai11117@vitbhopal.ac.in
 * Example invalid:
 *   - amritanshu.hr@vitbhopal.ac.in
 *   - anuj.gen.sec@vitbhopal.ac.in
 *   - president@genai.community
 *   - finance.core@vitbhopal.ac.in
 */
const VALID_EMAIL_PATTERN = /^[a-zA-Z0-9_-]+\.[0-9]{2}[a-zA-Z]{2,5}[0-9]{3,6}@vitbhopal\.ac\.in$/i;

function isValidMemberEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return VALID_EMAIL_PATTERN.test(email.trim());
}

async function run() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("==================================================================");
  console.log("Supabase Club Member Email Nullifier");
  console.log(`Mode: ${isDryRun ? "🔍 DRY RUN (Preview only)" : "⚡ LIVE EXECUTION (Updating Supabase)"}`);
  console.log("Pattern: firstname.registrationnumber@vitbhopal.ac.in");
  console.log("==================================================================\n");

  // 1. Process user_profiles table
  console.log("📌 Inspecting `user_profiles` table...");
  const { data: profiles, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, assigned_to_name, role");

  if (profileErr) {
    console.error("❌ Error fetching `user_profiles`:", profileErr.message);
  } else if (!profiles || profiles.length === 0) {
    console.log("ℹ️ No records found in `user_profiles`.");
  } else {
    console.log(`Found ${profiles.length} profiles in \`user_profiles\`.\n`);

    const validProfiles: typeof profiles = [];
    const invalidProfiles: typeof profiles = [];

    for (const p of profiles) {
      if (isValidMemberEmail(p.email)) {
        validProfiles.push(p);
      } else if (p.email !== null) {
        invalidProfiles.push(p);
      }
    }

    console.log(`✅ Valid emails (${validProfiles.length}):`);
    validProfiles.forEach((p) => {
      console.log(`   - [VALID]   ${(p.email || "").padEnd(45)} | ${p.assigned_to_name || p.full_name || p.id}`);
    });

    console.log(`\n⚠️ Invalid emails to NULL OUT (${invalidProfiles.length}):`);
    invalidProfiles.forEach((p) => {
      console.log(`   - [INVALID] ${(p.email || "null").padEnd(45)} | ${p.assigned_to_name || p.full_name || p.id} (${p.role})`);
    });

    if (!isDryRun && invalidProfiles.length > 0) {
      console.log(`\nUpdating ${invalidProfiles.length} rows in \`user_profiles\` to email = NULL...`);
      let successCount = 0;
      let failCount = 0;

      for (const p of invalidProfiles) {
        const { error: updateErr } = await supabase
          .from("user_profiles")
          .update({ email: null, updated_at: new Date().toISOString() })
          .eq("id", p.id);

        if (updateErr) {
          console.error(`   ❌ Failed to null email for ID ${p.id} (${p.email}):`, updateErr.message);
          if (updateErr.message.includes("violates not-null constraint")) {
            console.error("      💡 Tip: The `email` column has a NOT NULL constraint. Run the SQL schema relaxation script provided below.");
          }
          failCount++;
        } else {
          console.log(`   ✅ Nulled email for ID ${p.id} (was: ${p.email})`);
          successCount++;
        }
      }
      console.log(`\nFinished \`user_profiles\`: ${successCount} updated, ${failCount} errors.`);
    }
  }

  // 2. Process members table (if email column exists)
  console.log("\n------------------------------------------------------------------");
  console.log("📌 Inspecting `members` table (if email column exists)...");
  try {
    const { data: members, error: membersErr } = await supabase
      .from("members")
      .select("id, name, email")
      .limit(500);

    if (membersErr) {
      if (membersErr.message.includes("column") && membersErr.message.includes("email")) {
        console.log("ℹ️ `members` table does not have an `email` column (member logins and emails reside in `user_profiles`).");
      } else {
        console.log("ℹ️ `members` table query result:", membersErr.message);
      }
    } else if (members && members.length > 0) {
      const invalidMembers = members.filter((m: any) => m.email && !isValidMemberEmail(m.email));
      console.log(`Found ${invalidMembers.length} invalid email entries in \`members\` table.`);
      if (!isDryRun && invalidMembers.length > 0) {
        for (const m of invalidMembers) {
          await supabase.from("members").update({ email: null } as any).eq("id", m.id);
          console.log(`   ✅ Nulled email in \`members\` for: ${m.name} (was: ${(m as any).email})`);
        }
      }
    }
  } catch (err: any) {
    console.log("ℹ️ Note on `members` table:", err.message || err);
  }

  console.log("\n==================================================================");
  console.log("Operation Complete!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
