import { describe, it, expect } from "vitest";
import {
  normalizeDegrees,
  projectEntity,
  calculateRiggingCoordinates,
} from "./projection";

describe("1. Degrees Normalization Math", () => {
  it("should keep boundaries identical", () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(180)).toBe(180);
    expect(normalizeDegrees(-180)).toBe(-180);
  });

  it("should normalize positive and negative rotations correctly", () => {
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(370)).toBe(10);
    expect(normalizeDegrees(-190)).toBe(170);
    expect(normalizeDegrees(730)).toBe(10);
  });
});

describe("2. 2.5D Camera Projection Engine", () => {
  it("should center an entity directly in front of the boat", () => {
    const proj = projectEntity(0, 50, 0, 0, 0); // Entity North 50m, Boat (0,0) heading 0, look 0
    expect(proj.visible).toBe(true);
    expect(proj.bearingRel).toBe(0);
    expect(proj.screenX).toBeCloseTo(350, 2);
  });

  it("should project starboard FOV boundaries exactly at 660px screenX", () => {
    const proj = projectEntity(50, 50, 0, 0, 13); // 45 deg bearing, looking 13 deg -> +32 relative bearing
    expect(proj.visible).toBe(true);
    expect(proj.screenX).toBeCloseTo(660, 2);
  });

  it("should project port FOV boundaries exactly at 40px screenX", () => {
    const proj = projectEntity(-50, 50, 0, 0, -13); // -45 deg bearing, looking -13 deg -> -32 relative bearing
    expect(proj.visible).toBe(true);
    expect(proj.screenX).toBeCloseTo(40, 2);
  });

  it("should clip entities outside the +/- 32 degrees visual Field of View", () => {
    const proj = projectEntity(50, 50, 0, 0, 0); // bearingRel = 45 deg (> 32)
    expect(proj.visible).toBe(false);
  });

  it("should apply exponential vertical depth and scale according to distance", () => {
    const projNear = projectEntity(0, 15, 0, 0, 0); // 15m away
    const projFar = projectEntity(0, 120, 0, 0, 0); // 120m away

    expect(projNear.scale).toBeGreaterThan(projFar.scale);
    expect(projNear.screenY).toBeGreaterThan(projFar.screenY); // Near is lower (larger Y)
    expect(projFar.screenY).toBeLessThan(280);
    expect(projFar.screenY).toBeGreaterThan(200); // Far is tightly near horizon
  });
});

describe("3. Rigging Geometry & Backed Sails (Heave-To)", () => {
  it("should center the mast and spars when looking straight ahead", () => {
    const rig = calculateRiggingCoordinates(0, 0, 0, 0, 0, "starboard", true);
    expect(rig.mastX).toBe(350);
    expect(rig.bowX).toBe(220);
    expect(rig.clewX).toBe(350);
    expect(rig.travellerX).toBe(350);
    expect(rig.isJibBacked).toBe(false);
  });

  it("should shift coordinates left when looking to starboard", () => {
    const rig = calculateRiggingCoordinates(32, 0, 0, 0, 0, "starboard", true);
    expect(rig.mastX).toBe(40);
    expect(rig.bowX).toBe(-90);
    expect(rig.clewX).toBe(40);
  });

  it("should shift coordinates right when looking to port", () => {
    const rig = calculateRiggingCoordinates(-32, 0, 0, 0, 0, "starboard", true);
    expect(rig.mastX).toBe(660);
    expect(rig.bowX).toBe(530);
  });

  it("should detect backed genoa during heave-to windward sheeting", () => {
    // Wind on port (-30), genoa sheeted port -> BACKED
    const rigBacked = calculateRiggingCoordinates(0, 0, 0, 0, -30, "port", true);
    expect(rigBacked.isJibBacked).toBe(true);

    // Wind on port (-30), genoa sheeted starboard -> Standard lee trim (NOT backed)
    const rigNotBacked = calculateRiggingCoordinates(0, 0, 0, 0, -30, "starboard", true);
    expect(rigNotBacked.isJibBacked).toBe(false);
  });
});
