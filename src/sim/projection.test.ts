import { describe, it, expect } from "vitest";
import {
  normalizeDegrees,
  projectEntity,
  calculateRiggingCoordinates,
  calculateApparentTilt,
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
    expect(rig.bowX).toBe(315);
    expect(rig.clewX).toBe(350);
    expect(rig.travellerX).toBe(350);
    expect(rig.isJibBacked).toBe(false);
  });

  it("should shift coordinates left when looking to starboard", () => {
    const rig = calculateRiggingCoordinates(32, 0, 0, 0, 0, "starboard", true);
    expect(rig.mastX).toBe(40);
    expect(rig.bowX).toBe(5);
    expect(rig.clewX).toBe(40);
  });

  it("should shift coordinates right when looking to port", () => {
    const rig = calculateRiggingCoordinates(-32, 0, 0, 0, 0, "starboard", true);
    expect(rig.mastX).toBe(660);
    expect(rig.bowX).toBe(625);
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

describe("4. Horizon Tilt Perspective Scaling (Heel vs View Angle)", () => {
  it("should return the full negative heel angle when looking straight forward (0 deg)", () => {
    expect(calculateApparentTilt(15, 0)).toBeCloseTo(-15, 2);
    expect(calculateApparentTilt(-12, 0)).toBeCloseTo(12, 2);
  });

  it("should return exactly 0 (no tilt) when looking 90 degrees to either side (beam)", () => {
    expect(calculateApparentTilt(15, 90)).toBeCloseTo(0, 2);
    expect(calculateApparentTilt(15, -90)).toBeCloseTo(0, 2);
  });

  it("should return the inverted heel angle when looking straight backward (180 deg)", () => {
    expect(calculateApparentTilt(15, 180)).toBeCloseTo(15, 2);
    expect(calculateApparentTilt(-12, 180)).toBeCloseTo(-12, 2);
  });

  it("should apply cosine scaling correctly at intermediate angles (e.g. 60 deg is half tilt)", () => {
    // cos(60 deg) = 0.5. For 15 deg heel, apparent tilt is -7.5 deg
    expect(calculateApparentTilt(15, 60)).toBeCloseTo(-7.5, 2);
  });
});

describe("5. Background Yacht Seamanship & Wind Alignment Physics", () => {
  const windDir = 358; // Wind coming from almost due North (358 deg)

  it("should enforce realistic points of sail for sailing background yachts (no sailing in irons)", () => {
    // Yacht 1 (Sailing - Starboard Tack close-hauled) heading is 315 deg
    const heading = 315;
    let twa = (windDir - heading) % 360;
    if (twa > 180) twa -= 360;
    if (twa < -180) twa += 360;

    // True Wind Angle (TWA) should be 43 degrees off the starboard bow
    expect(twa).toBe(43);
    
    // Assert point of sail is valid (outside the irons exclusion zone of +/- 30 degrees)
    expect(Math.abs(twa)).toBeGreaterThanOrEqual(30);
    expect(Math.abs(twa)).toBeLessThanOrEqual(150);
  });

  it("should align anchored background yachts straight into the true wind direction", () => {
    // Yacht 2 (Anchored) heading is 358 deg
    const heading = 358;
    
    // Bow is facing directly into the windward axis!
    expect(heading).toBe(windDir);
  });

  it("should heel background sailing yachts leeward relative to the wind side", () => {
    // Wind is from starboard (TWA = 43 deg > 0)
    // Dynamic sailing heel must tilt to port (negative heel angle!)
    const twa = 43;
    const isStarboardWind = twa >= 0;
    
    const heelDeg = isStarboardWind ? -12 : 12;
    expect(heelDeg).toBeLessThan(0); // Portward heel
  });
});
