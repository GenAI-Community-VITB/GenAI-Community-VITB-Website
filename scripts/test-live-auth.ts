import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_ACCOUNTS = [
  "president@genai.community",
  "aiml.lead@genai.community",
  "tech.lead@genai.community",
  "event.lead@genai.community",
  "tech.coremember.001@genai.community",
];

const TEST_PASSWORD = "GenAICommunity@2026-27";

async function runDiagnostics() {
  console.log("=== SUPABASE AUTH DIAGNOSTIC SCAN ===");
  console.log(`Target URL: ${supabaseUrl}`);

  // 1. List users from Supabase Auth admin
  const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to list users from Supabase Admin:", listError.message);
  } else {
    console.log(`✅ Total users in auth.users: ${authUsers.users.length}`);
  }

  // 2. Test signInWithPassword for each test account
  for (const email of TEST_ACCOUNTS) {
    console.log(`\n--- Testing: ${email} ---`);
    
    // Check if user exists in auth.users
    const userInAuth = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!userInAuth) {
      console.log(`❌ NOT FOUND in auth.users: ${email}`);
      continue;
    }
    console.log(`✅ Found in auth.users (ID: ${userInAuth.id}, Confirmed: ${userInAuth.email_confirmed_at ? "YES" : "NO"})`);

    // Check user_profiles table
    const { data: profile, error: profileErr } = await adminClient
      .from("user_profiles")
      .select("*, roles:member_roles(*)")
      .eq("id", userInAuth.id)
      .single();

    if (profileErr) {
      console.log(`⚠️ user_profiles query failed: ${profileErr.message}`);
    } else {
      console.log(`✅ user_profiles entry exists: Full Name = "${profile.full_name}", Role = "${profile.role}", Active = ${profile.is_active}`);
    }

    // Attempt actual client sign-in
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });

    if (signInErr) {
      console.log(`❌ signInWithPassword FAILED: ${signInErr.message} (Status: ${signInErr.status})`);
    } else {
      console.log(`✅ signInWithPassword SUCCESS! Access Token issued for UID: ${signInData.user?.id}`);
    }
  }

  console.log("\n=== DIAGNOSTIC SCAN COMPLETE ===");
}

runDiagnostics().catch(console.error);
