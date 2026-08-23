export interface YachtParams {
  name: string;
  loa: number;             // Length overall (m)
  displacementKg: number;  // Displacement (kg)
  refTws: number;          // Reference true wind speed (kts) for polar tables (e.g. 12.0)
  polarTwa: number[];      // Reference true wind angles (deg)
  polarStw: number[];      // Reference speeds through water (kts) at refTws
  polarHeel: number[];     // Reference heel angles (deg) at refTws
  maxEngineRpm: number;    // Maximum engine RPM (e.g. 3000)
  maxEngineSpeed: number;  // Speed at max RPM under engine (kts)
}

// Default model parameters: Beneteau First 36.7 (matching YD-41 VPP target)
export const beneteau367: YachtParams = {
  name: "Beneteau First 36.7",
  loa: 10.64,
  displacementKg: 5915,
  refTws: 12.0,
  polarTwa: [0, 30, 45, 60, 90, 120, 150, 180],
  polarStw: [0, 4.8, 6.7, 7.4, 8.2, 8.5, 7.6, 6.5],
  polarHeel: [0, 15, 22, 25, 20, 12, 5, 2],
  maxEngineRpm: 3000,
  maxEngineSpeed: 7.5
};

export interface EvaluateYachtInput {
  tws: number;
  twa: number;
  mainTrim: number;
  genoaTrim: number;
  mainsailRaised: boolean;
  genoaRaised: boolean;
  engineRpm: number;
  rudderAngle: number;
  currentSpeed?: number;
  currentDir?: number;
}

export interface EvaluateYachtResult {
  stw: number;
  heel: number;
  leeway: number;
  aws: number;
  awa: number;
  sog: number;
  cog_rel: number;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngle180(deg: number): number {
  let angle = deg % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}

/**
 * Robust 1D Linear Interpolator
 */
export function interpolate(x: number, xs: number[], ys: number[]): number {
  if (xs.length === 0 || ys.length === 0) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x >= xs[i] && x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[0];
}

/**
 * Apparent Wind & Ground Motion Vector Mathematics
 * Values relative to boat: x is forward (bow), y is starboard
 */
export function calculateApparentWind(
  tws: number,
  twa: number,
  stw: number,
  leeway = 0,
  currentSpeed = 0,
  currentDir = 0
): { aws: number; awa: number; sog: number; cog_rel: number } {
  const leewayRad = degToRad(leeway);
  // Boat velocity vector in water frame
  const v_bw = [stw * Math.cos(leewayRad), stw * Math.sin(leewayRad)];

  // True wind vector in water frame (wind coming FROM twa)
  const twaRad = degToRad(twa);
  const v_tw = [-tws * Math.cos(twaRad), -tws * Math.sin(twaRad)];

  // Apparent wind vector (True Wind - Boat Velocity)
  const v_aw = [v_tw[0] - v_bw[0], v_tw[1] - v_bw[1]];

  const aws = Math.sqrt(v_aw[0] * v_aw[0] + v_aw[1] * v_aw[1]);
  let awa = radToDeg(Math.atan2(-v_aw[1], -v_aw[0]));
  awa = normalizeAngle180(awa);

  // Ground motion: Boat Velocity in water frame + current vector
  const currRad = degToRad(currentDir);
  const v_curr = [currentSpeed * Math.cos(currRad), currentSpeed * Math.sin(currRad)];
  const v_ground = [v_bw[0] + v_curr[0], v_bw[1] + v_curr[1]];

  const sog = Math.sqrt(v_ground[0] * v_ground[0] + v_ground[1] * v_ground[1]);
  let cog_rel = radToDeg(Math.atan2(v_ground[1], v_ground[0]));
  cog_rel = normalizeAngle180(cog_rel);

  return { aws, awa, sog, cog_rel };
}

/**
 * Sail Efficiency and Degradation Formula (Gaussian Bell Curve)
 */
export function evaluateSailEfficiency(awa: number, trim: number): number {
  const twaAbs = Math.abs(awa);
  // 0.5 is optimal trim in this qualitative model
  let efficiency = Math.exp(-Math.pow(trim - 0.5, 2) / 0.05);

  // Luffing penalty if wind is too tight to the bow for the current trim
  if (twaAbs < 25) {
    efficiency *= (twaAbs / 25.0);
  }
  return Math.max(0.0, efficiency);
}

/**
 * Steady-state equilibrium solver for yacht performance.
 */
export function evaluateYacht(
  params: YachtParams,
  input: EvaluateYachtInput
): EvaluateYachtResult {
  const twaAbs = Math.abs(input.twa);
  const currentSpeed = input.currentSpeed ?? 0;
  const currentDir = input.currentDir ?? 0;

  // 1. Base Equilibrium from Polar scaled by wind speed ratio
  const windScale = input.tws / params.refTws;
  const polarStw = interpolate(twaAbs, params.polarTwa, params.polarStw);
  const polarHeel = interpolate(twaAbs, params.polarTwa, params.polarHeel);

  const baseStw = polarStw * windScale;
  const baseHeel = polarHeel * (windScale * windScale);

  // 2. Sail Efficiency adjustment based on active sails and trim
  const effMain = input.mainsailRaised ? evaluateSailEfficiency(twaAbs, input.mainTrim) : 0;
  const effGenoa = input.genoaRaised ? evaluateSailEfficiency(twaAbs, input.genoaTrim) : 0;
  const totalEff = (effMain + effGenoa) / 2.0;

  // 3. Engine Thrust (Simple linear RPM model)
  const engineStw = (input.engineRpm / params.maxEngineRpm) * params.maxEngineSpeed;

  // 4. Resulting STW (root sum of squares of sail and engine speed targets)
  const stw = Math.sqrt(Math.pow(baseStw * totalEff, 2) + Math.pow(engineStw, 2));
  const heel = baseHeel * totalEff;

  // Leeway: higher at high heel and low speed
  let leeway = 4.0 * (heel / 25.0) * (Math.max(1.0, baseStw) / Math.max(0.5, stw));
  if (input.twa < 0) leeway = -leeway;

  // 5. Apparent wind & SOG/COG computations
  const apparentWind = calculateApparentWind(
    input.tws,
    input.twa,
    stw,
    leeway,
    currentSpeed,
    currentDir
  );

  return {
    stw,
    heel,
    leeway,
    ...apparentWind
  };
}
