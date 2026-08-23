import { describe, it, expect } from "vitest";
import { evaluateYacht, beneteau367 } from "./physics";
import fixtures from "../../physics/yacht_fixtures.json";

describe("TS Physics VPP Polar Regression Tests", () => {
  const chRef = fixtures.close_hauled_12kt;
  const luffRef = fixtures.luffed_12kt;

  it("1. Close-hauled 12kt steady state performance", () => {
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

    expect(chActual.stw).toBeCloseTo(chRef.stw, 2);
    expect(chActual.heel).toBeCloseTo(chRef.heel, 2);
    expect(chActual.leeway).toBeCloseTo(chRef.leeway, 2);
    expect(chActual.aws).toBeCloseTo(chRef.aws, 2);
    expect(chActual.awa).toBeCloseTo(chRef.awa, 2);
    expect(chActual.sog).toBeCloseTo(chRef.sog, 2);
    expect(chActual.cog_rel).toBeCloseTo(chRef.cog_rel, 2);
  });

  it("2. Luffed 12kt steady state performance", () => {
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

    expect(luffActual.stw).toBeCloseTo(luffRef.stw, 2);
    expect(luffActual.heel).toBeCloseTo(luffRef.heel, 2);
    expect(luffActual.leeway).toBeCloseTo(luffRef.leeway, 2);
    expect(luffActual.aws).toBeCloseTo(luffRef.aws, 2);
    expect(luffActual.awa).toBeCloseTo(luffRef.awa, 2);
    expect(luffActual.sog).toBeCloseTo(luffRef.sog, 2);
    expect(luffActual.cog_rel).toBeCloseTo(luffRef.cog_rel, 2);
  });

  it("3. Transition sample first-order lag simulation transitions", () => {
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

      current.stw += (luffRef.stw - current.stw) * rates.stw * dt;
      current.heel += (luffRef.heel - current.heel) * rates.heel * dt;
      current.leeway += (luffRef.leeway - current.leeway) * rates.leeway * dt;

      expect(current.stw).toBeCloseTo(refStep.stw, 2);
      expect(current.heel).toBeCloseTo(refStep.heel, 2);
      expect(current.leeway).toBeCloseTo(refStep.leeway, 2);
    }
  });
});
