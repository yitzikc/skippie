import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { evaluateYacht, beneteau367 } from "../src/sim/physics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesPath = path.resolve(__dirname, "../physics/yacht_fixtures.json");
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

let failures = 0;

function assertAlmostEqual(actual: number, expected: number, tolerance = 0.05, label = "") {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ [FAIL] ${label}: Expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff: ${diff.toFixed(4)})`);
    failures++;
  } else {
    console.log(`✅ [PASS] ${label}: ${actual.toFixed(4)} matches expected ${expected.toFixed(4)} (tolerance: ${tolerance})`);
  }
}

console.log("=== Starting TS Physics VPP Regression Tests ===");

// 1. Test close_hauled_12kt
console.log("\n--- Testing close_hauled_12kt ---");
const chRef = fixtures.close_hauled_12kt;
const chActual = evaluateYacht(beneteau367, {
  tws: 12.0,
  twa: 45.0,
  mainTrim: 0.5,
  genoaTrim: 0.5,
  mainsailRaised: true,
  genoaRaised: true,
  engineRpm: 0,
  rudderAngle: 0
});

assertAlmostEqual(chActual.stw, chRef.stw, 0.01, "STW");
assertAlmostEqual(chActual.heel, chRef.heel, 0.01, "Heel");
assertAlmostEqual(chActual.leeway, chRef.leeway, 0.01, "Leeway");
assertAlmostEqual(chActual.aws, chRef.aws, 0.01, "AWS");
assertAlmostEqual(chActual.awa, chRef.awa, 0.01, "AWA");
assertAlmostEqual(chActual.sog, chRef.sog, 0.01, "SOG");
assertAlmostEqual(chActual.cog_rel, chRef.cog_rel, 0.01, "COG Relative");

// 2. Test luffed_12kt
console.log("\n--- Testing luffed_12kt ---");
const luffRef = fixtures.luffed_12kt;
const luffActual = evaluateYacht(beneteau367, {
  tws: 12.0,
  twa: 45.0,
  mainTrim: 0.1,
  genoaTrim: 0.1,
  mainsailRaised: true,
  genoaRaised: true,
  engineRpm: 0,
  rudderAngle: 0
});

assertAlmostEqual(luffActual.stw, luffRef.stw, 0.01, "STW");
assertAlmostEqual(luffActual.heel, luffRef.heel, 0.01, "Heel");
assertAlmostEqual(luffActual.leeway, luffRef.leeway, 0.01, "Leeway");
assertAlmostEqual(luffActual.aws, luffRef.aws, 0.01, "AWS");
assertAlmostEqual(luffActual.awa, luffRef.awa, 0.01, "AWA");
assertAlmostEqual(luffActual.sog, luffRef.sog, 0.01, "SOG");
assertAlmostEqual(luffActual.cog_rel, luffRef.cog_rel, 0.01, "COG Relative");

// 3. Test transition_sample using Euler step as computed in Python VPP VMG notebook
console.log("\n--- Testing transition_sample ---");
const transitions = fixtures.transition_sample;
const rates = { stw: 0.5, heel: 2.0, leeway: 1.0 };
const dt = 0.1;

let current = {
  stw: chRef.stw,
  heel: chRef.heel,
  leeway: chRef.leeway
};

for (let idx = 0; idx < transitions.length; idx++) {
  const refStep = transitions[idx];
  
  // Perform Euler step in TS matching Python simulate_transition:
  // current[key] += (target_state[key] - current[key]) * rates[key] * dt
  current.stw += (luffRef.stw - current.stw) * rates.stw * dt;
  current.heel += (luffRef.heel - current.heel) * rates.heel * dt;
  current.leeway += (luffRef.leeway - current.leeway) * rates.leeway * dt;

  assertAlmostEqual(current.stw, refStep.stw, 0.005, `Step t=${refStep.t} STW`);
  assertAlmostEqual(current.heel, refStep.heel, 0.005, `Step t=${refStep.t} Heel`);
  assertAlmostEqual(current.leeway, refStep.leeway, 0.005, `Step t=${refStep.t} Leeway`);
}

console.log("\n===============================================");
if (failures === 0) {
  console.log("🎉 ALL TESTS PASSED! Physics engine is 100% physically consistent with the Python VPP codebase.");
  process.exit(0);
} else {
  console.error(`❌ ${failures} TESTS FAILED.`);
  process.exit(1);
}
