import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { ROSTER_2026, DEFAULT_PASSWORD } from "./seed-logins";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function reseedCleanAuth() {
  console.log("============================================================");
  console.log("Reseeding Clean Supabase Auth Users for 2026-27");
  console.log("============================================================\n");

  // Step 1: For each user in ROSTER_2026, ensure password is set properly via Admin API
  for (const item of ROSTER_2026) {
    try {
      // Find existing profile
      const { data: existingProfile } = await adminSupabase
        .from("user_profiles")
        .select("id")
        .eq("email", item.email)
        .single();

      let userId = existingProfile?.id;

      if (userId) {
        // Update user via Admin Auth API (this fixes password and syncs schema)
        const { data: updatedUser, error: updateErr } = await adminSupabase.auth.admin.updateUserById(
          userId,
          {
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: item.fullName,
              assigned_to_name: item.assignedToName,
              role: item.primaryRole,
            },
          },
        );

        if (updateErr) {
          // If user doesn't exist in auth.users, create it
          const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
            email: item.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: item.fullName,
              assigned_to_name: item.assignedToName,
              role: item.primaryRole,
            },
          });

          if (createErr || !newUser.user) {
            console.error(`❌ Failed to create auth user for ${item.email}:`, createErr?.message);
            continue;
          }
          userId = newUser.user.id;
        }
      } else {
        const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
          email: item.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: item.fullName,
            assigned_to_name: item.assignedToName,
            role: item.primaryRole,
          },
        });

        if (createErr || !newUser.user) {
          console.error(`❌ Failed to create auth user for ${item.email}:`, createErr?.message);
          continue;
        }
        userId = newUser.user.id;
      }

      // Upsert user_profiles
      await adminSupabase.from("user_profiles").upsert(
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

      console.log(`✅ [OK] ${item.email.padEnd(38)} -> ${item.assignedToName}`);
    } catch (err: any) {
      console.error(`❌ [ERROR] ${item.email}:`, err.message);
    }
  }

  // Step 2: Test live login with president@genai.community and aiml.lead@genai.community
  console.log("\n--- Testing Live Login ---");
  const testEmail = "president@genai.community";
  const { data: signData, error: signErr } = await anonSupabase.auth.signInWithPassword({
    email: testEmail,
    password: DEFAULT_PASSWORD,
  });

  if (signErr) {
    console.error(`❌ Live Login Test Failed for ${testEmail}:`, signErr);
  } else {
    console.log(`🎉 SUCCESS! Logged in as ${testEmail} (User ID: ${signData.user.id})`);
  }

  const testEmail2 = "aiml.lead@genai.community";
  const { data: signData2, error: signErr2 } = await anonSupabase.auth.signInWithPassword({
    email: testEmail2,
    password: DEFAULT_PASSWORD,
  });

  if (signErr2) {
    console.error(`❌ Live Login Test Failed for ${testEmail2}:`, signErr2);
  } else {
    console.log(`🎉 SUCCESS! Logged in as ${testEmail2} (User ID: ${signData2.user.id})`);
  }
}

reseedCleanAuth();
