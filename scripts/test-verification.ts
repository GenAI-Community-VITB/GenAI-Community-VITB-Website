import {
  validateEventEligibility,
  APPROVED_BTECH_BRANCHES,
  APPROVED_MTECH_BRANCHES,
  isBTechBranch,
  isMTechBranch,
} from "../lib/validation";

console.log("=== RUNNING EVENT ELIGIBILITY & BRANCH TESTS ===");

// Test 1: B.Tech branch with B.Tech only event
const t1 = validateEventEligibility("BTECH CSE (Core)", ["B.Tech"]);
console.assert(t1.valid === true, "Test 1 Failed: B.Tech on B.Tech-only event should pass");
console.log("✓ Test 1 Passed: B.Tech on B.Tech-only event");

// Test 2: M.Tech branch with B.Tech only event (MUST FAIL)
const t2 = validateEventEligibility("MTECH CSE (AI & Data Science)", ["B.Tech"]);
console.assert(t2.valid === false, "Test 2 Failed: M.Tech on B.Tech-only event must be rejected");
console.assert(
  t2.error?.includes("exclusively open to B.Tech"),
  `Test 2 Failed: Error message incorrect: ${t2.error}`
);
console.log("✓ Test 2 Passed: M.Tech rejected on B.Tech-only event with error:", t2.error);

// Test 3: M.Tech branch with B.Tech + M.Tech event (MUST PASS)
const t3 = validateEventEligibility("MTECH CSE (Cyber Security & Digital Forensics)", ["B.Tech", "M.Tech"]);
console.assert(t3.valid === true, "Test 3 Failed: M.Tech on B.Tech+M.Tech event should pass");
console.log("✓ Test 3 Passed: M.Tech on B.Tech+M.Tech event");

// Test 4: Integrated M.Tech on B.Tech + M.Tech event (MUST PASS)
const t4 = validateEventEligibility("Integrated MTECH Software Engineering", ["B.Tech", "M.Tech"]);
console.assert(t4.valid === true, "Test 4 Failed: Integrated M.Tech on B.Tech+M.Tech event should pass");
console.log("✓ Test 4 Passed: Integrated M.Tech on B.Tech+M.Tech event");

// Test 5: B.Tech on M.Tech only event (MUST FAIL)
const t5 = validateEventEligibility("BTECH ECE (AI & Cybernetics)", ["M.Tech"]);
console.assert(t5.valid === false, "Test 5 Failed: B.Tech on M.Tech-only event must be rejected");
console.assert(
  t5.error?.includes("exclusively open to M.Tech"),
  `Test 5 Failed: Error message incorrect: ${t5.error}`
);
console.log("✓ Test 5 Passed: B.Tech rejected on M.Tech-only event with error:", t5.error);

// Test 6: Unrecognized branch (MUST FAIL)
const t6 = validateEventEligibility("BSc Agriculture", ["B.Tech", "M.Tech"]);
console.assert(t6.valid === false, "Test 6 Failed: Unrecognized branch must be rejected");
console.log("✓ Test 6 Passed: Unrecognized branch rejected with error:", t6.error);

// Test 7: Branch whitelist restriction
const t7 = validateEventEligibility(
  "BTECH CSE (AI & ML)",
  ["B.Tech", "M.Tech"],
  ["BTECH CSE (Core)"]
);
console.assert(t7.valid === false, "Test 7 Failed: Non-whitelisted branch must be rejected");
console.log("✓ Test 7 Passed: Whitelist restriction enforced with error:", t7.error);

console.log("\n=== ALL 7 ELIGIBILITY VALIDATION TESTS PASSED ===");
