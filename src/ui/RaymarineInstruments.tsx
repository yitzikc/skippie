import { useState, useEffect } from "react";
import type { BoatState, EnvironmentState } from "../sim/types";

// Segment indexes: [a, b, c, d, e, f, g]
// Map characters to active segments
const SEGMENTS: Record<string, boolean[]> = {
  "0": [true, true, true, true, true, true, false],
  "1": [false, true, true, false, false, false, false],
  "2": [true, true, false, true, true, false, true],
  "3": [true, true, true, true, false, false, true],
  "4": [false, true, true, false, false, true, true],
  "5": [true, false, true, true, false, true, true],
  "6": [true, false, true, true, true, true, true],
  "7": [true, true, true, false, false, false, false],
  "8": [true, true, true, true, true, true, true],
  "9": [true, true, true, true, false, true, true],
  "-": [false, false, false, false, false, false, true],
  " ": [false, false, false, false, false, false, false],
};

interface DigitProps {
  char: string;
  showDp?: boolean;
  scale?: number;
}

/**
 * Renders a single custom high-fidelity SVG 7-segment digit with a slanted slant transform skewX(-6)
 * to perfectly match retro Raymarine hardware. Renders light-grey 'ghost' unlit segments in background.
 */
export function SevenSegmentDigit({ char, showDp, scale = 1.0 }: DigitProps) {
  const activeSegments = SEGMENTS[char] || SEGMENTS[" "];

  // SVG coordinates for standard retro 7-segment digits inside a 20x30 coordinate box
  const paths = [
    // a (top horizontal)
    "M 3,2 L 15,2 L 13,5 L 5,5 Z",
    // b (top-right vertical)
    "M 16,3 L 16,14 L 13,12 L 13,5 Z",
    // c (bottom-right vertical)
    "M 16,16 L 16,27 L 13,25 L 13,18 Z",
    // d (bottom horizontal)
    "M 3,28 L 15,28 L 13,25 L 5,25 Z",
    // e (bottom-left vertical)
    "M 2,27 L 5,25 L 5,18 L 2,16 Z",
    // f (top-left vertical)
    "M 2,14 L 5,12 L 5,5 L 2,3 Z",
    // g (middle horizontal hexagon)
    "M 4,15 L 5,13.5 L 13,13.5 L 14,15 L 13,16.5 L 5,16.5 Z",
  ];

  return (
    <svg
      className="seven-segment-digit-svg"
      viewBox="0 0 20 30"
      width={20 * scale}
      height={30 * scale}
      aria-hidden="true"
    >
      <g transform="skewX(-6) translate(1, 0)">
        {paths.map((d, i) => {
          const isLit = activeSegments[i];
          return (
            <path
              key={i}
              d={d}
              className={`segment segment-${i} ${isLit ? "lit" : "unlit"}`}
            />
          );
        })}
        {/* Decimal Point */}
        <circle
          cx="18"
          cy="28"
          r="1.8"
          className={`segment-dp ${showDp ? "lit" : "unlit"}`}
        />
      </g>
    </svg>
  );
}

interface DisplayProps {
  value: string;
  length?: number;
  scale?: number;
}

/**
 * Parses numeric strings (e.g. "3.9", "7.05") and renders a row of SevenSegmentDigits.
 * Associating decimals with the preceding digit appropriately to keep spacing identical to hardware!
 */
export function SevenSegmentDisplay({ value, length, scale = 1.0 }: DisplayProps) {
  let str = value;
  if (length) {
    const rawLen = str.replace(".", "").length;
    if (rawLen < length) {
      str = " ".repeat(length - rawLen) + str;
    }
  }

  const digits: { char: string; hasDp: boolean }[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === ".") {
      if (digits.length > 0) {
        digits[digits.length - 1].hasDp = true;
      }
    } else {
      digits.push({ char, hasDp: false });
    }
  }

  return (
    <div className="seven-segment-container">
      {digits.map((d, index) => (
        <SevenSegmentDigit key={index} char={d.char} showDp={d.hasDp} scale={scale} />
      ))}
    </div>
  );
}

interface InstrumentProps {
  boat: BoatState;
  environment: EnvironmentState;
  backlightLevel: number; // 0 (off), 1 (low), 2 (mid), 3 (high)
  onToggleBacklight: () => void;
}

/**
 * 1. TRIDATA INSTRUMENT (ST60 Tridata style)
 * Shows Depth, Speed, and Odometer (Log/Trip).
 */
export function TridataInstrument({
  boat,
  backlightLevel,
}: Omit<InstrumentProps, "environment" | "onToggleBacklight">) {
  const [depthRef, setDepthRef] = useState<"surface" | "keel">("surface");
  const [speedRef, setSpeedRef] = useState<"sow" | "sog">("sow");
  const [bottomDisplay, setBottomDisplay] = useState<"log" | "trip">("log");
  const [tripDistance, setTripDistance] = useState<number>(0.24); // Starting offset to show it running

  // Simulate trip logging when the boat is moving (using speedOverGroundKnots or speedKnots)
  useEffect(() => {
    const interval = setInterval(() => {
      const speed = boat.speedKnots || 0;
      if (speed > 0.05) {
        // knots * (1 second / 3600 seconds) = NM traveled in this second
        setTripDistance((prev) => prev + speed / 3600);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [boat.speedKnots]);

  const handleResetTrip = () => {
    if (bottomDisplay === "trip") {
      setTripDistance(0);
    }
  };

  // Depth calculation with optional draft offset
  const surfaceDepth = 6.8 + (boat.speedKnots || 0) * 0.2; // depth changes slightly with motion/current
  const keelDraft = 1.8; // Beneteau 36.7 keel draft (meters)
  const safeDepth = Math.max(0.4, surfaceDepth - keelDraft);
  const activeDepth = depthRef === "surface" ? surfaceDepth : safeDepth;

  // Speed selection
  const sow = boat.speedKnots || 0.0;
  const sog = boat.speedOverGroundKnots ?? sow;
  const activeSpeed = speedRef === "sow" ? sow : sog;

  // Cumulative lifetime log
  const lifetimeLog = 9550.6 + tripDistance;

  // Values formatted for SevenSegmentDisplay
  const depthStr = activeDepth.toFixed(1);
  const speedStr = activeSpeed.toFixed(2);
  const bottomStr = (bottomDisplay === "log" ? lifetimeLog : tripDistance).toFixed(bottomDisplay === "log" ? 1 : 2);

  return (
    <div
      className={`st60-instrument-bezel ${backlightLevel > 0 ? "backlight-active" : ""}`}
      data-backlight={backlightLevel}
      aria-label="Tridata Instrument panel showing Depth, Speed, and Trip log"
    >
      <div className="instrument-top-label" aria-hidden="true">
        <span className="st60-badge">SK36+</span>
        <span className="model-badge">TRIDATA</span>
      </div>

      {/* LCD SCREEN */}
      <div className="st60-lcd-screen">
        {/* ROW 1: DEPTH */}
        <div className="lcd-row row-depth">
          <div className="row-labels" aria-hidden="true">
            <span className="lcd-label">DEPTH</span>
            <span className="lcd-sub-label">{depthRef === "keel" ? "KEEL" : "METRES"}</span>
          </div>
          <div className="lcd-digits-container" aria-label={`Depth: ${depthStr} meters`}>
            <SevenSegmentDisplay value={depthStr} length={3} scale={0.9} />
          </div>
        </div>

        {/* ROW 2: SPEED */}
        <div className="lcd-row row-speed">
          <div className="row-labels" aria-hidden="true">
            <span className="lcd-label">SPEED</span>
            <span className="lcd-sub-label">{speedRef === "sog" ? "SOG KTS" : "KTS"}</span>
          </div>
          <div className="lcd-digits-container" aria-label={`Speed: ${speedStr} knots`}>
            <SevenSegmentDisplay value={speedStr} length={4} scale={0.9} />
          </div>
        </div>

        {/* ROW 3: LOG / TRIP */}
        <div className="lcd-row row-log">
          <div className="row-labels" aria-hidden="true">
            <span className="lcd-label-small">{bottomDisplay === "log" ? "LOG" : "TRIP"}</span>
          </div>
          <div className="lcd-digits-container small" aria-label={`${bottomDisplay === "log" ? "Lifetime Log" : "Trip distance"}: ${bottomStr} nautical miles`}>
            <SevenSegmentDisplay value={bottomStr} length={6} scale={0.65} />
            <span className="log-units" aria-hidden="true">NM</span>
          </div>
        </div>

        {/* RED RETRO Skippie Series BRANDING */}
        <div className="lcd-branding" aria-hidden="true">Skippie Series</div>
      </div>

      {/* RUBBERY BUTTONS */}
      <div className="st60-button-bank">
        <button
          type="button"
          className="st60-button"
          onClick={() => setDepthRef((prev) => (prev === "surface" ? "keel" : "surface"))}
          title="Toggle Keel / Surface offset"
        >
          DEPTH
        </button>
        <button
          type="button"
          className="st60-button"
          onClick={() => setSpeedRef((prev) => (prev === "sow" ? "sog" : "sow"))}
          title="Toggle Speed Over Water (SOW) / Speed Over Ground (SOG)"
        >
          SPEED
        </button>
        <button
          type="button"
          className="st60-button"
          onClick={() => setBottomDisplay((prev) => (prev === "log" ? "trip" : "log"))}
          title="Toggle Cumulative Odometer (LOG) / Trip logger"
        >
          TRIP
        </button>
        <button
          type="button"
          className="st60-button"
          onClick={handleResetTrip}
          disabled={bottomDisplay !== "trip"}
          title="Reset Trip Distance (Only when displaying TRIP)"
        >
          RESET
        </button>
      </div>
    </div>
  );
}

/**
 * 2. WIND INSTRUMENT (ST60 Wind style)
 * Shows an apparent/true wind pointer and wind speed inside an integrated physical LCD frame.
 */
export function WindInstrument({
  boat,
  environment,
  backlightLevel,
  onToggleBacklight,
}: InstrumentProps) {
  const [mode, setMode] = useState<"apparent" | "true">("apparent");

  // Apparent wind details
  const heading = boat.headingDeg || 0;
  const apparentAngle = boat.apparentWindAngleDeg !== undefined ? boat.apparentWindAngleDeg : 0;
  const apparentSpeed = boat.apparentWindSpeedKnots !== undefined ? boat.apparentWindSpeedKnots : environment.windStrengthKnots;

  // True wind details
  let trueAngleRelative = 0;
  if (boat.apparentWindAngleDeg !== undefined) {
    const rawTWA = environment.windDirectionDeg - heading;
    trueAngleRelative = normalizeDegrees(rawTWA);
  } else {
    trueAngleRelative = apparentAngle;
  }
  const trueSpeed = environment.windStrengthKnots;

  // Select readings based on True / Apparent selection
  const activeAngle = mode === "apparent" ? apparentAngle : trueAngleRelative;
  const activeSpeed = mode === "apparent" ? apparentSpeed : trueSpeed;

  return (
    <div
      className={`st60-instrument-bezel ${backlightLevel > 0 ? "backlight-active" : ""}`}
      data-backlight={backlightLevel}
      aria-label={`Wind Instrument showing ${mode} wind angle at ${activeAngle.toFixed(0)} degrees and wind speed at ${activeSpeed.toFixed(1)} knots`}
    >
      <div className="instrument-top-label" aria-hidden="true">
        <span className="st60-badge">SK36+</span>
        <span className="model-badge">WIND</span>
      </div>

      {/* DIAL PANEL & INNER LCD */}
      <div className="st60-lcd-screen wind-dial-container">
        {/* Analog dial representation */}
        <svg className="wind-dial-svg" viewBox="0 0 200 200" aria-hidden="true">
          {/* Background Solid Sectors (Wedges): Red Port arc on left, Green Starboard arc on right */}
          <path
            d="M 100 100 L 29.0 59.0 A 82 82 0 0 1 100 18 Z"
            fill="#e13838"
            opacity="0.18"
          />
          <path
            d="M 100 100 L 100 18 A 82 82 0 0 1 171.0 59.0 Z"
            fill="#2eb151"
            opacity="0.18"
          />

          {/* Compass rose layout tick marks */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x1 = 100 + 82 * Math.cos(rad);
            const y1 = 100 + 82 * Math.sin(rad);
            const x2 = 100 + (angle % 90 === 0 ? 70 : 75) * Math.cos(rad);
            const y2 = 100 + (angle % 90 === 0 ? 70 : 75) * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#2a2f31"
                strokeWidth={angle % 90 === 0 ? "2.2" : "1"}
              />
            );
          })}

          {/* Numerical degree readouts around the dial rim */}
          <text x="146" y="58" className="dial-num">30</text>
          <text x="54" y="58" className="dial-num">30</text>
          <text x="168" y="99" className="dial-num">60</text>
          <text x="32" y="99" className="dial-num">60</text>
          <text x="157" y="142" className="dial-num">90</text>
          <text x="43" y="142" className="dial-num">90</text>
          <text x="127" y="174" className="dial-num">120</text>
          <text x="73" y="174" className="dial-num">120</text>

          {/* Subtle real-needle dropshadow */}
          <line
            x1="100"
            y1="100"
            x2={100 + 78 * Math.cos(((activeAngle - 90) * Math.PI) / 180)}
            y2={100 + 78 * Math.sin(((activeAngle - 90) * Math.PI) / 180)}
            stroke="rgba(0,0,0,0.14)"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ transformOrigin: "100px 100px", transform: "translate(1.5px, 2px)" }}
          />

          {/* Real-time Pointer Needle */}
          <g
            style={{
              transform: `rotate(${activeAngle}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 0.15s ease-out",
            }}
          >
            <line x1="100" y1="100" x2="100" y2="18" stroke="#1d2021" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="100,10 95,25 105,25" fill="#1d2021" />
          </g>

          {/* Hub caps */}
          <circle cx="100" cy="100" r="9" fill="#2d3032" stroke="#4d5052" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="3" fill="#101213" />
        </svg>

        {/* Center-bottom Digital Readout box (Wind Speed) using 7-segment SVG Display */}
        <div className="wind-digital-box" aria-hidden="true">
          <SevenSegmentDisplay value={activeSpeed.toFixed(1)} length={3} scale={0.55} />
          <div className="wind-digital-label">KTS</div>
        </div>

        {/* True / App Mode lights indicator on bottom LCD */}
        <div className="wind-mode-indicators" aria-hidden="true">
          <span className={`mode-indicator ${mode === "true" ? "active" : ""}`}>TRUE</span>
          <span className="mode-indicator-separator">|</span>
          <span className={`mode-indicator ${mode === "apparent" ? "active" : ""}`}>APP</span>
        </div>

        {/* BRANDING LABEL */}
        <div className="lcd-branding wind-branding" aria-hidden="true">Skippie Series</div>
      </div>

      {/* RUBBERY BUTTONS */}
      <div className="st60-button-bank">
        <button
          type="button"
          className="st60-button button-light"
          onClick={onToggleBacklight}
          title="Toggle synchronized red backlighting"
        >
          {/* Bulb Icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" className="button-icon-svg" aria-hidden="true">
            <path d="M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z" />
          </svg>
        </button>
        <button
          type="button"
          className="st60-button text-stacked"
          onClick={() => setMode((prev) => (prev === "apparent" ? "true" : "apparent"))}
          title="Toggle True Wind / Apparent Wind"
        >
          <span>TRUE</span>
          <span>APP</span>
        </button>
        <button
          type="button"
          className="st60-button"
          title="Toggle VMG (Velocity Made Good)"
        >
          VMG
        </button>
        <button
          type="button"
          className="st60-button button-disp"
          title="System Display cycles"
        >
          DISP
        </button>
      </div>
    </div>
  );
}

function normalizeDegrees(value: number) {
  let normalized = value % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}
