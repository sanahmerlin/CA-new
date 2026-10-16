import { scanForRedFlags, calculateFinalSeverity } from "../src/lib/safety/redflags";

function runTests() {
  console.log("--- Starting Red Flags Safety Unit Tests ---");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
    }
  }

  // Test 1: Acute Chest Pain
  const r1 = scanForRedFlags("I have severe chest pain and pressure since morning");
  assert(r1.hasCritical === true, "Severe chest pain flags hasCritical = true");
  assert(r1.suggestedSeverity === "critical", "Severe chest pain yields critical severity");

  // Test 2: Severe Respiratory Distress
  const r2 = scanForRedFlags("Doctor, my mother cannot breathe properly, she is gasping");
  assert(r2.hasCritical === true, "Cannot breathe flags hasCritical = true");
  assert(r2.suggestedSeverity === "critical", "Respiratory distress yields critical severity");

  // Test 3: Stroke Signs (FAST)
  const r3 = scanForRedFlags("Noticeable face drooping and slurred speech");
  assert(r3.hasCritical === true, "Face drooping and slurred speech flags critical");

  // Test 4: Suspected DVT
  const r4 = scanForRedFlags("My right calf swelling and pain has increased");
  assert(r4.hasUrgent === true, "Calf swelling flags hasUrgent = true");
  assert(r4.suggestedSeverity === "urgent", "Calf swelling yields urgent severity");

  // Test 5: Normal healthy response
  const r5 = scanForRedFlags("Took all my morning pills. Feeling fine, no pain or fever.");
  assert(r5.hasCritical === false && r5.hasUrgent === false, "Normal response has no red flags");
  assert(r5.suggestedSeverity === "none", "Normal response yields none severity");

  // Test 6: MAX Severity Calculation Clamping
  // Gemini says 'watch' or 'none', but Red Flag says 'critical' -> MUST BE CRITICAL
  const s1 = calculateFinalSeverity("none", "critical", "watch");
  assert(s1 === "critical", "Gemini watch cannot lower a red-flag critical");

  const s2 = calculateFinalSeverity("none", "critical", "none");
  assert(s2 === "critical", "Gemini none cannot lower a red-flag critical");

  // Rule urgent, Gemini none -> MUST BE URGENT
  const s3 = calculateFinalSeverity("urgent", "none", "none");
  assert(s3 === "urgent", "Rule urgent is preserved");

  // Gemini escalates watch to urgent -> MUST BE URGENT
  const s4 = calculateFinalSeverity("watch", "none", "urgent");
  assert(s4 === "urgent", "Gemini can raise watch to urgent");

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
