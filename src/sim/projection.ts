/**
 * Normalizes any degree angle to the range [-180, 180]
 */
export function normalizeDegrees(value: number): number {
  let normalized = value % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

export interface ProjectionResult {
  visible: boolean;
  screenX: number;
  screenY: number;
  scale: number;
  distance: number;
  bearingRel: number;
}

/**
 * 2.5D Camera Projection Engine
 * Maps world absolute coordinate differences (dx, dy) relative to the boat
 * to projected horizontal and vertical screen coordinates on the cockpit viewBox (700x420).
 * Handles FOV clipping and perspective depth scaling.
 */
export function projectEntity(
  entX: number,
  entY: number,
  boatX: number,
  boatY: number,
  viewHeading: number
): ProjectionResult {
  const dx = entX - boatX;
  const dy = entY - boatY;

  // Distance in meters
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Absolute bearing clockwise from North (0 degrees)
  let bearingAbs = Math.atan2(dx, dy) * (180 / Math.PI);
  if (bearingAbs < 0) bearingAbs += 360;

  // Relative bearing to the skipper's look vector
  const bearingRel = normalizeDegrees(bearingAbs - viewHeading);

  // Check if inside the skipper's visual Field of View (+/- 32 degrees FOV bounds)
  const visible = Math.abs(bearingRel) <= 32 && distance >= 4 && distance <= 260;

  // Projected screen coordinates (viewBox 0 0 700 420)
  // Horizontal center at 350
  const screenX = 350 + (bearingRel / 32) * 310;

  // Asymptotic vertical depth mapping: horizon at y=200, deck rail at y=280
  const screenY = 200 + (1 - Math.exp(-22 / distance)) * 80;

  // Proportional size scale: closer is larger
  const scale = Math.max(0.15, Math.min(3.5, 45 / distance));

  return {
    visible,
    screenX,
    screenY,
    scale,
    distance,
    bearingRel,
  };
}

export interface RiggingCoordinates {
  mastX: number;
  bowX: number;
  clewX: number;
  clewY: number;
  vangX: number;
  vangY: number;
  sheetBoomX: number;
  sheetBoomY: number;
  travellerX: number;
  jibClewX: number;
  jibClewY: number;
  isJibBacked: boolean;
}

/**
 * Rigging Geometry Calculator
 * Computes the relative visual coordinates of the mast, boom, sails, sheets,
 * traveler, and back-sheeting windward offsets based on view angle and physical trims.
 */
export function calculateRiggingCoordinates(
  viewAngle: number,
  boomOffset: number,
  jibOffset: number,
  travellerOffset: number,
  apparentWindAngle: number,
  genoaTack: "port" | "starboard",
  genoaVisible: boolean
): RiggingCoordinates {
  // Mast shifts horizontally in perspective based on skipper view offset
  const mastX = 350 - (viewAngle / 32) * 310;
  const bowX = mastX - 35;

  // Boom Clew
  const clewX = mastX + boomOffset * 3.6;
  const clewY = 212 + 8 + Math.abs(boomOffset) * 0.14;

  // Boom Vang attachment
  const vangX = mastX + (clewX - mastX) * 0.45;
  const vangY = 212 + (clewY - 212) * 0.45 + 2;

  // Mainsheet boom block attachment
  const sheetBoomX = mastX + (clewX - mastX) * 0.82;
  const sheetBoomY = 212 + (clewY - 212) * 0.82 + 2;

  // Traveler slider
  const travellerX = mastX + travellerOffset * 0.65;

  // Backed Genoa check (Heave-To check)
  const isJibBacked = genoaVisible && (
    (apparentWindAngle < 0 && genoaTack === "port") ||
    (apparentWindAngle > 0 && genoaTack === "starboard")
  );

  let jibClewX = bowX + (mastX - bowX) * 0.38 + jibOffset * 3.0;
  let jibClewY = 275 - (275 - 20) * 0.3 + Math.abs(jibOffset) * 0.08;

  if (isJibBacked) {
    const windwardOffset = apparentWindAngle < 0 ? -12 : 12;
    jibClewX = bowX + (mastX - bowX) * 0.35 + windwardOffset * 2.2;
    jibClewY = 275 - (275 - 20) * 0.31;
  }

  return {
    mastX,
    bowX,
    clewX,
    clewY,
    vangX,
    vangY,
    sheetBoomX,
    sheetBoomY,
    travellerX,
    jibClewX,
    jibClewY,
    isJibBacked,
  };
}

/**
 * Apparent Horizon Tilt Calculator
 * Computes the visual tilt angle of the horizon relative to the cockpit frame.
 * Scales with the cosine of the skipper's looking view angle relative to the bow centerline
 * because looking along the beam (90 deg to side) aligns the view with the axis of heel rotation.
 */
export function calculateApparentTilt(heelDeg: number, viewAngle: number): number {
  const rad = (viewAngle * Math.PI) / 180;
  return -heelDeg * Math.cos(rad);
}
