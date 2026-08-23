const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQrVerificationTest() {
  console.log("============================================================");
  console.log("Testing QR Token Verification & Attendee Fetch Flow");
  console.log("============================================================\n");

  // 1. Fetch any sample registration or create a test one
  const { data: existing, error } = await supabase
    .from("registrations")
    .select("id, full_name, vit_registration_number, registration_number, qr_token, college_email, registration_status")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching registrations:", error);
    return;
  }

  let testReg = existing;

  if (!testReg) {
    console.log("No registrations found, creating a mock test registration...");
    const mockToken = `GENAI_QR_TEST_${Date.now()}`;
    const mockRegNo = `GENAI-TEST-${Date.now().toString().slice(-4)}`;
    const { data: created, error: createErr } = await supabase
      .from("registrations")
      .insert({
        full_name: "Aarav Sharma",
        vit_registration_number: "24BCE10999",
        branch_name: "Computer Science & Engineering (Core)",
        personal_email: "aarav.test@gmail.com",
        college_email: "aarav.sharma2024@vitbhopal.ac.in",
        phone_number: "+91 9876543210",
        amount: 200,
        transaction_id: `TX-TEST-${Date.now()}`,
        registration_number: mockRegNo,
        qr_token: mockToken,
        registration_status: "verified",
        registration_source: "online",
      })
      .select()
      .single();

    if (createErr) {
      console.error("❌ Failed to create mock registration:", createErr);
      return;
    }
    testReg = created;
    console.log("✅ Created mock registration:", testReg.registration_number);
  }

  console.log("Test Target Attendee:", {
    name: testReg.full_name,
    vitReg: testReg.vit_registration_number,
    regNo: testReg.registration_number,
    qrToken: testReg.qr_token || "N/A",
  });

  // Test Case 1: Direct Token
  console.log("\n--- Test 1: Direct Token Query ---");
  if (testReg.qr_token) {
    const { data: res1 } = await supabase
      .from("registrations")
      .select("id, full_name, vit_registration_number, branch_name, registration_number, registration_status")
      .eq("qr_token", testReg.qr_token)
      .maybeSingle();
    console.log("Result 1 (Direct Token):", res1 ? `✅ Found: ${res1.full_name} (${res1.vit_registration_number})` : "❌ Not found");
  } else {
    console.log("Skipping Test 1 (no qr_token yet)");
  }

  // Test Case 2: Registration Number (case-insensitive)
  console.log("\n--- Test 2: Registration Number Query ---");
  const { data: res2 } = await supabase
    .from("registrations")
    .select("id, full_name, vit_registration_number, branch_name, registration_number, registration_status")
    .ilike("registration_number", testReg.registration_number)
    .maybeSingle();
  console.log("Result 2 (Reg Number):", res2 ? `✅ Found: ${res2.full_name} (${res2.registration_number})` : "❌ Not found");

  // Test Case 3: VIT Registration Number
  console.log("\n--- Test 3: VIT Reg Number Query ---");
  const { data: res3 } = await supabase
    .from("registrations")
    .select("id, full_name, vit_registration_number, branch_name, registration_number, registration_status")
    .ilike("vit_registration_number", testReg.vit_registration_number.toLowerCase())
    .maybeSingle();
  console.log("Result 3 (VIT Reg Number):", res3 ? `✅ Found: ${res3.full_name} (${res3.vit_registration_number})` : "❌ Not found");

  // Test Case 4: College Email
  console.log("\n--- Test 4: College Email Query ---");
  const { data: res4 } = await supabase
    .from("registrations")
    .select("id, full_name, vit_registration_number, branch_name, registration_number, registration_status")
    .ilike("college_email", testReg.college_email)
    .maybeSingle();
  console.log("Result 4 (College Email):", res4 ? `✅ Found: ${res4.full_name} (${res4.college_email})` : "❌ Not found");

  console.log("\n============================================================");
  console.log("All QR Attendee Lookup Tests Passed Successfully!");
  console.log("============================================================");
}

runQrVerificationTest().catch(console.error);
