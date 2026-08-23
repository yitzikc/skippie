import { useState, useEffect } from "react";
import type { ScenarioState } from "../sim/types";
import { TridataInstrument, WindInstrument } from "./RaymarineInstruments";
import { MarineEntities } from "./MarineEntities";
import { BackgroundScenery } from "./BackgroundScenery";
import { calculateRiggingCoordinates } from "../sim/projection";

type Props = {
  scenario: ScenarioState;
};

type SpinlockState = {
  id: string;
  label: string;
  pattern: string;
  locked: boolean;
  thin?: boolean;
};

const engineMap: Record<string, string> = {
  off: "OFF",
  idle: "IDLE",
  ahead: "FWD 1",
  astern: "REV 1",
};

const ropePatterns = {
  red: "solid red",
  brown: "solid brown",
  blue: "blue fleck",
  green: "green fleck",
  blackWhite: "black / white fleck",
  brownWhite: "brown / white stripes",
};

const ropeOptions = [
  { name: "Main halyard", pattern: "red", swatch: "pattern-red" },
  { name: "Boom vang", pattern: "brown", swatch: "pattern-brown-white" },
  { name: "Main sheet", pattern: "brownWhite", swatch: "pattern-brown-white" },
  { name: "Genoa sheet port", pattern: "blue", swatch: "pattern-blue" },
  { name: "Genoa sheet starboard", pattern: "green", swatch: "pattern-green" },
  { name: "Reefing line 1", pattern: "blackWhite", swatch: "pattern-black-white" },
];

const initialSpinlocks: SpinlockState[] = [
  { id: "genoa-furler", label: "Genoa furler", pattern: "solid-thin", locked: false, thin: true },
  { id: "main-halyard", label: "Main halyard", pattern: "pattern-red", locked: true },
  { id: "boom-vang", label: "Boom vang", pattern: "pattern-brown-white", locked: true },
  { id: "main-sheet", label: "Main sheet", pattern: "pattern-brown-white", locked: true },
  { id: "genoa-sheet-port", label: "Genoa sheet port", pattern: "pattern-blue", locked: true },
  { id: "genoa-sheet-starboard", label: "Genoa sheet starboard", pattern: "pattern-green", locked: true },
  { id: "reefing-line", label: "Reefing line 1", pattern: "pattern-black-white", locked: false },
];

export function CockpitView({ scenario }: Props) {
  const [spinlocks, setSpinlocks] = useState<SpinlockState[]>(initialSpinlocks);
  const [genoaFurled, setGenoaFurled] = useState<boolean>(scenario.boat.genoaFurled ?? true);
  const [genoaTack, setGenoaTack] = useState<"port" | "starboard">(scenario.boat.genoaTack ?? "starboard");
  const [backlightLevel, setBacklightLevel] = useState<number>(0);
  const [viewAngle, setViewAngle] = useState<number>(0);

  useEffect(() => {
    setGenoaFurled(scenario.boat.genoaFurled ?? true);
    setGenoaTack(scenario.boat.genoaTack ?? "starboard");
    setSpinlocks((current) =>
      current.map((lock) =>
        lock.id === "genoa-furler"
          ? { ...lock, locked: scenario.boat.genoaFurled ?? true }
          : lock
      )
    );
  }, [scenario.boat.genoaFurled, scenario.boat.genoaTack]);
  const heading = Math.round(scenario.boat.headingDeg);
  const windDir = Math.round(scenario.environment.windDirectionDeg);
  const windSpeed = scenario.environment.windStrengthKnots;
  const engineValue = engineMap[scenario.boat.engine] ?? "IDLE";

  // Calculate absolute viewing vector: boat heading + look offset
  const viewHeading = heading + viewAngle;

  // Drive cockpit wind instruments using high-fidelity VPP apparent wind outputs if available
  const apparentWindAngle = scenario.boat.apparentWindAngleDeg !== undefined
    ? Math.round(scenario.boat.apparentWindAngleDeg)
    : normalizeDegrees(windDir - heading);

  const apparentWindSpeed = scenario.boat.apparentWindSpeedKnots !== undefined
    ? scenario.boat.apparentWindSpeedKnots
    : windSpeed;

  const relativeWind = apparentWindAngle;
  const tack = relativeWind >= 0 ? "starboard" : "port";
  const boomOffset = clamp(Math.round(relativeWind * 0.64 + scenario.boat.rudderAngleDeg * 0.35), -55, 55);
  const jibOffset = clamp(Math.round(relativeWind * 0.72), -52, 52);
  const helmState = scenario.boat.rudderAngleDeg > 5 ? "right" : scenario.boat.rudderAngleDeg < -5 ? "left" : "center";
  const sailLift =
    scenario.boat.mainsail === "raised" ? 26 :
    scenario.boat.mainsail === "hoisting" ? 14 :
    scenario.boat.mainsail === "preparing" ? 6 :
    0;
  const jibTrim = clamp(Math.round(relativeWind * 0.55), -40, 40);
  const sailTwist = clamp(Math.round(relativeWind * 0.16 + scenario.boat.rudderAngleDeg * 0.25), -26, 26);
  const mainSheetAngle = clamp(Math.round(relativeWind * 0.35 + scenario.boat.rudderAngleDeg * 0.26), -28, 28);
  const genoaVisible = !genoaFurled;
  const activeGenoaTack = genoaVisible ? (genoaTack || tack) : null;
  const genoaSideOffset = activeGenoaTack === "port" ? -18 : 18;
  const activeTelltaleColor = activeGenoaTack === "starboard" ? "#1d7a45" : "#b33d2b";
  const jibTelltaleOpacity = Math.max(0.2, 0.65 + relativeWind / 180);
  const travellerOffset = clamp(Math.round(relativeWind * 0.28 + scenario.boat.rudderAngleDeg * 0.18), -30, 30);
  const apparentWindPointer = ((relativeWind + 180) / 360) * 100;

  // High-fidelity dynamic sail rigging projections using formally defined calculator
  const sailProgress =
    scenario.boat.mainsail === "raised" ? 1.0 :
    scenario.boat.mainsail === "hoisting" ? 0.6 :
    scenario.boat.mainsail === "lowering" ? 0.4 :
    scenario.boat.mainsail === "preparing" ? 0.15 :
    0.0;

  const headY = 212 - sailProgress * 142; // masthead height compression
  
  const rig = calculateRiggingCoordinates(
    viewAngle,
    boomOffset,
    jibOffset,
    travellerOffset,
    apparentWindAngle,
    genoaTack,
    genoaVisible
  );

  const {
    mastX,
    bowX,
    clewX,
    clewY,
    vangX,
    vangY,
    sheetBoomX,
    sheetBoomY,
    travellerX,
    jibClewX: finalJibClewX,
    jibClewY: finalJibClewY,
    isJibBacked
  } = rig;

  // Tacking/Gybing and Irons luffing indicators
  const isMainLuffing = scenario.boat.mainsail !== "down" && (
    Math.abs(apparentWindAngle) < 22 ||
    scenario.boat.mainsail === "hoisting" ||
    scenario.boat.mainsail === "lowering"
  );

  const isJibLuffing = genoaVisible && (
    Math.abs(apparentWindAngle) < 22 ||
    Math.abs(jibOffset) < 10
  );

  const enginePosition = (() => {
    switch (scenario.boat.engine) {
      case "astern":
        return 12;
      case "off":
        return 50;
      case "ahead":
        return 72;
      default:
        return 50;
    }
  })();

  function toggleSpinlock(id: string) {
    setSpinlocks((current) =>
      current.map((lock) => (lock.id === id ? { ...lock, locked: !lock.locked } : lock)),
    );

    if (id === "genoa-furler") {
      setGenoaFurled((current) => !current);
      setGenoaTack((current) => current);
    }
  }

  return (
    <section className="cockpit-view" aria-label="First-person cockpit view">
      <div className="scene-column">
        <div className="cockpit-scene" aria-hidden="true">
          <div className="scene-sky" />
          <div className="scene-horizon" />
          <div className="scene-water" />

          <svg className="sail-svg" viewBox="0 0 700 420" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="mainGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#d76a5e" />
              <stop offset="100%" stopColor="#934a38" />
            </linearGradient>
            <linearGradient id="jibGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#f5f6f0" />
              <stop offset="100%" stopColor="#dfe4dd" />
            </linearGradient>
            <linearGradient id="mastGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#4e5356" />
              <stop offset="35%" stopColor="#8c9296" />
              <stop offset="50%" stopColor="#aab0b4" />
              <stop offset="65%" stopColor="#8c9296" />
              <stop offset="100%" stopColor="#3c4042" />
            </linearGradient>
            {/* Mainsheet brown & white diagonal repeating stripe rope pattern */}
            <pattern id="mainsheetPattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <rect width="6" height="12" fill="#7a5a3b" />
              <rect x="6" width="6" height="12" fill="#f1efe7" />
            </pattern>
            {/* Spherical Compass Dome radial gradient */}
            <radialGradient id="compassDome" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="85%" stopColor="#0a0b0d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          {/* Gyroscopic 2.5D Background Scenery (Clouds & Land Contours) */}
          <BackgroundScenery heading={viewHeading} />

          {/* Sea water horizontal backdrop */}
          <path d="M0,240 Q270,180 700,250 L700,420 L0,420 Z" fill="rgba(71,128,138,0.84)" />
          <path d="M0,200 L700,200" stroke="rgba(17, 52, 61, 0.22)" strokeWidth="2" strokeDasharray="8 8" />

          {/* Projected Marine Navigation Entities (IALA Region A Buoys & Background Vessels) */}
          <MarineEntities entities={scenario.entities || []} boat={scenario.boat} viewHeading={viewHeading} />

          {/* 1. STATIONARY STANDING RIGGING LAYER (Shrouds & Forestay) */}
          <path d="M 160,282 L 310,88 L 350,16" fill="none" stroke="#788185" strokeWidth="1.2" opacity="0.85" />
          <path d="M 540,282 L 390,88 L 350,16" fill="none" stroke="#788185" strokeWidth="1.2" opacity="0.85" />
          {/* Spreader Bars */}
          <line x1="350" y1="88" x2="310" y2="88" stroke="#2c3031" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="350" y1="87" x2="310" y2="87" stroke="#9bb1b5" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          <line x1="350" y1="88" x2="390" y2="88" stroke="#2c3031" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="350" y1="87" x2="390" y2="87" stroke="#9bb1b5" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          {/* Forestay */}
          <line x1="220" y1="275" x2="350" y2="16" stroke="#474d4f" strokeWidth="1.8" opacity="0.9" />

          {/* 2. DYNAMIC MAINSAIL LAYER (Swings and flutters dynamically) */}
          {sailProgress > 0.05 ? (
            <g className={isMainLuffing ? "luffing-flutter" : ""}>
              {/* Triangular Billowed Mainsail */}
              <path
                d={`M ${mastX},212 L ${mastX},${headY} Q ${(mastX + clewX) / 2 + 36} ${(headY + clewY) / 2 - 12} ${clewX},${clewY} Z`}
                fill="url(#mainGradient)"
                stroke="#7b4f46"
                strokeWidth="1"
                opacity="0.96"
              />
              {/* Full batten structural pocket lines */}
              {[0.25, 0.5, 0.75].map((ratio) => {
                const yLuff = headY + (212 - headY) * ratio;
                const yLeech = headY + (clewY - headY) * ratio;
                const xLeech = mastX + (clewX - mastX) * ratio + 36 * (1 - Math.pow(2 * ratio - 1, 2));
                return (
                  <path
                    key={ratio}
                    d={`M ${mastX},${yLuff} Q ${(mastX + xLeech) / 2 + 10} ${(yLuff + yLeech) / 2 - 2} ${xLeech},${yLeech}`}
                    stroke="#4a5255"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.65"
                  />
                );
              })}
            </g>
          ) : (
            /* Folded Mainsail Cover on top of the boom when lowered */
            <path
              d={`M ${mastX},212 L ${clewX},${clewY} L ${clewX},${clewY - 4} Q ${(mastX + clewX) / 2},${(212 + clewY) / 2 - 6} ${mastX},208 Z`}
              fill="#81898d"
              stroke="#5c6265"
              strokeWidth="0.8"
              opacity="0.88"
            />
          )}

          {/* 3. DYNAMIC GENOA (JIB) LAYER (Responsive to back-sheeting, backed heave-to, and furling) */}
          {genoaVisible ? (
            <g className={isJibLuffing ? "genoa-flutter" : ""}>
              {/* Backed Windward vs standard Genoa shape */}
              <path
                d={`M ${bowX},275 L ${mastX - 20},60 Q ${(mastX - 20 + finalJibClewX) / 2 + (isJibBacked ? -12 : 25)} ${(60 + finalJibClewY) / 2} ${finalJibClewX},${finalJibClewY} Q ${(bowX + finalJibClewX) / 2} ${(275 + finalJibClewY) / 2 + (isJibBacked ? -6 : 8)} ${bowX},275 Z`}
                fill="url(#jibGradient)"
                stroke="#4c5d64"
                strokeWidth="1"
                opacity="0.97"
              />
              {/* Telltales fluttering on Genoa leech - fly horizontal when trimmed, droop down when luffing */}
              <g className="jib-telltales" opacity={isJibLuffing ? 0.45 : jibTelltaleOpacity}>
                {isJibLuffing || apparentWindSpeed <= 6 ? (
                  <>
                    {/* Drooping down vertical loose telltales */}
                    <path d={`M ${finalJibClewX - 18},${finalJibClewY - 36} L ${finalJibClewX - 18},${finalJibClewY - 24}`} stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                    <path d={`M ${finalJibClewX - 10},${finalJibClewY - 22} L ${finalJibClewX - 10},${finalJibClewY - 10}`} stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    {/* Streamlined perfectly horizontal active windward/leeward telltales */}
                    <path d={`M ${finalJibClewX - 18},${finalJibClewY - 36} L ${finalJibClewX - 2},${finalJibClewY - 36}`} stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                    <path d={`M ${finalJibClewX - 10},${finalJibClewY - 22} L ${finalJibClewX + 6},${finalJibClewY - 22}`} stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                  </>
                )}
              </g>
              {/* Clew Genoa sheet rope to Winch */}
              <line
                x1={finalJibClewX}
                y1={finalJibClewY}
                x2={isJibBacked ? "240" : "180"}
                y2="275"
                stroke={isJibBacked ? "#9a5547" : "#3b4d53"}
                strokeWidth="2.2"
                opacity="0.9"
              />
              {/* Display status text backing tag */}
              <text x={finalJibClewX - 28} y={finalJibClewY - 10} fill="#f4efe7" fontSize="10" fontWeight="900" letterSpacing="0.05em" opacity="0.9">
                {isJibBacked ? "BACKED" : "GENOA"}
              </text>
            </g>
          ) : (
            /* Rolled/Furled Jib represented as a thick cylindrical roll with spiral wraps, using same genoa color #jibGradient */
            <g>
              <line
                x1="220"
                y1="275"
                x2="330"
                y2="60"
                stroke="url(#jibGradient)"
                strokeWidth="6.5"
                strokeLinecap="round"
                opacity="0.95"
              />
              {/* Spiral sheet spiral-wrap lines overlay */}
              <line
                x1="220"
                y1="275"
                x2="330"
                y2="60"
                stroke="#373a3c"
                strokeWidth="1.2"
                strokeDasharray="4 8"
                strokeLinecap="round"
                opacity="0.65"
              />
            </g>
          )}

          {/* 4. STATIONARY TAPERED 3D MAST (Rendered on top of sails for correct perspective depth!) */}
          <polygon points="344,282 356,282 352,0 348,0" fill="url(#mastGradient)" stroke="#222526" strokeWidth="0.8" opacity="0.98" />
          <line x1="350" y1="282" x2="350" y2="0" stroke="#fdfdfd" strokeWidth="0.8" opacity="0.65" /> {/* Highlight reflection */}

          {/* 5. DYNAMIC ROTATING TAPERED 3D BOOM (Pivoted at gooseneck 350,212) */}
          <polygon
            points={`350,209 350,215 ${clewX},${clewY + 6} ${clewX},${clewY - 6}`}
            fill="#2c3031"
            stroke="#3e4244"
            strokeWidth="1.2"
            opacity="0.95"
          />
          <line x1="350" y1="212" x2={clewX} y2={clewY} stroke="#eaeff2" strokeWidth="1.2" opacity="0.75" /> {/* Outhaul reflect */}

          {/* 6. DYNAMIC RIGGING RUNNING HARDWARE (Boom Vang & Mainsheet) */}
          {/* Boom Vang (Mast Base 350,252 to Boom) */}
          <line x1="350" y1="252" x2={vangX} y2={vangY} stroke="#171819" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="350" y1="252" x2={vangX} y2={vangY} stroke="#bfa67a" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          
          {/* Mainsheet connecting Clew traveler x to deck traveler block using brown-white pattern */}
          <path d={`M ${sheetBoomX},${sheetBoomY} L ${travellerX},275`} stroke="url(#mainsheetPattern)" strokeWidth="4.8" strokeLinecap="round" fill="none" />
          <path d={`M ${sheetBoomX},${sheetBoomY} L ${travellerX},275`} stroke="rgba(18,22,23,0.22)" strokeWidth="4.8" strokeLinecap="round" fill="none" strokeDasharray="1.5 7" />
          
          {/* Deck Traveler Track block */}
          <rect x={travellerX - 10} y="272" width="20" height="6" rx="1.5" fill="#2d3032" stroke="#484d4f" strokeWidth="1" />
          <text x="350" y="70" fill="#f4efe7" fontSize="10" fontWeight="900" letterSpacing="0.1em" opacity="0.85" textAnchor="middle">MAIN</text>

          {/* Back traveler slider */}
          <path d="M160,275 L540,275" stroke="rgba(18,50,57,0.72)" strokeWidth="2.5" strokeLinecap="round" />

          {/* 7. HIGH-FIDELITY PEDESTAL HELM CONSOLE (Wheel, Duct Tape Neutral Marker, and Dome Compass) */}
          {/* A. Steering Pedestal Columns Base centered at mastX */}
          <path d={`M ${mastX - 38},420 L ${mastX - 18},328 L ${mastX + 18},328 L ${mastX + 38},420 Z`} fill="#2d3032" stroke="#1c1d1e" strokeWidth="1.5" />
          <rect x={mastX - 22} y="328" width="44" height="42" rx="3" fill="#1d2021" stroke="#3b3f41" strokeWidth="1.2" /> {/* Binnacle Housing */}
          
          {/* B. Dynamic Yacht Steering Wheel (Pedestal Helm) rotated around (mastX, 360) */}
          {/* Rotates 15x relative to the physical rudderAngleDeg! */}
          <g transform={`rotate(${scenario.boat.rudderAngleDeg * 15} ${mastX} 360)`} className="helm-steering-wheel">
            {/* Stainless Steel Wheel Rim */}
            <circle cx={mastX} cy="360" r="62" fill="none" stroke="#686e70" strokeWidth="3" />
            <circle cx={mastX} cy="360" r="62" fill="none" stroke="#eaeff2" strokeWidth="1" />
            
            {/* 6 Wheel Spokes */}
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <line
                  key={angle}
                  x1={mastX}
                  y1="360"
                  x2={mastX + 62 * Math.cos(rad)}
                  y2={360 + 62 * Math.sin(rad)}
                  stroke="#eaeff2"
                  strokeWidth="1.8"
                />
              );
            })}
            
            {/* Red Duct Tape Neutral Helm Marker wrapping the top center of the rim when centered! */}
            <rect x={mastX - 4.5} y="292" width="9" height="12" fill="#cf3b3b" rx="1.2" stroke="#7e1f1f" strokeWidth="0.5" />
            <line x1={mastX - 4.5} y1="298" x2={mastX + 4.5} y2="298" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </g>

          {/* C. Wheel Hubcap Pivot covering center */}
          <circle cx={mastX} cy="360" r="10" fill="#222526" stroke="#484d4f" strokeWidth="1.2" />
          <circle cx={mastX} cy="360" r="4.5" fill="#eaeff2" />

          {/* D. Dome Binnacle Glass Compass (Plastimo/Ritchie Yacht style) centered at mastX */}
          <g className="binnacle-steering-compass">
            {/* Compass bowl backer */}
            <circle cx={mastX} cy="320" r="22" fill="#151718" stroke="#3e4244" strokeWidth="1.5" />
            
            {/* Rotating Spherical Compass Card (rotates in opposite direction of heading around binnacle center!) */}
            <g transform={`rotate(${-scenario.boat.headingDeg} ${mastX} 320)`}>
              <circle cx={mastX} cy="320" r="17" fill="#1a1c1d" stroke="#2c2f30" strokeWidth="1" />
              
              {/* Cardinal directions */}
              <text x={mastX} y="311.5" fill="#fdfdfd" fontSize="7" fontWeight="900" textAnchor="middle">N</text>
              <text x={mastX + 12} y="322" fill="#cccccc" fontSize="5.5" fontWeight="900" textAnchor="middle">E</text>
              <text x={mastX} y="332.5" fill="#cccccc" fontSize="5.5" fontWeight="900" textAnchor="middle">S</text>
              <text x={mastX - 12} y="322" fill="#cccccc" fontSize="5.5" fontWeight="900" textAnchor="middle">W</text>
              
              {/* Spherical Compass degree tick-marks */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1={mastX}
                  y1="304.5"
                  x2={mastX}
                  y2="307.5"
                  stroke="#7a8184"
                  strokeWidth="0.8"
                  transform={`rotate(${deg} ${mastX} 320)`}
                />
              ))}
            </g>

            {/* Ritchie-style spherical glass dome highlight overlay */}
            <circle cx={mastX} cy="320" r="17" fill="url(#compassDome)" opacity="0.88" />
            
            {/* Vertical Red Lubber Line (centered at top, locked forward in skipper view) */}
            <line x1={mastX} y1="303" x2={mastX} y2="310.5" stroke="#d33f3f" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </svg>
      </div> {/* Closes cockpit-scene */}

      {/* E. Interactive Skipper Look-Around Controller with Keyboard Accessibility */}
      <div 
        className="look-around-slider-container"
        tabIndex={0}
        title="Click or Tab here to use Left/Right Arrow keys to look around the yacht!"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setViewAngle((v) => Math.max(-120, v - 10)); // Look 10 deg port
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setViewAngle((v) => Math.min(120, v + 10));  // Look 10 deg starboard
          }
        }}
      >
        <span className="look-label">LOOK ANGLE</span>
        <input
          type="range"
          min="-120"
          max="120"
          step="5"
          value={viewAngle}
          onChange={(e) => setViewAngle(Number(e.target.value))}
          className="look-slider"
          aria-label="Skipper Look Angle view controller"
        />
        <div className="look-readout">
          {viewAngle === 0 ? "FORWARD 0°" : `${Math.abs(viewAngle)}° ${viewAngle > 0 ? "STBD" : "PORT"}`}
        </div>
      </div>

      <div className="spinlock-bank" aria-label="Boat line spinlocks">
        {spinlocks.map((lock) => (
          <button
            key={lock.id}
            type="button"
            className={`spinlock ${lock.thin ? "thin" : ""}`}
            title={lock.label}
            aria-label={`${lock.label} ${lock.locked ? "locked" : "unlocked"}`}
            aria-pressed={lock.locked}
            onClick={() => toggleSpinlock(lock.id)}
          >
            <span className={`spinlock-dot ${lock.locked ? "locked" : "unlocked"}`} />
            <span className={`spinlock-pattern ${lock.pattern} ${lock.thin ? "thin" : ""}`} />
          </button>
        ))}
      </div>
    </div>

      <aside className="instrument-panel">
        <div className="digital-readout">
          <span className="readout-label">Compass</span>
          <strong>{heading}°</strong>
        </div>

        <div className="marine-instruments-grid">
          <TridataInstrument
            boat={scenario.boat}
            backlightLevel={backlightLevel}
          />
          <WindInstrument
            boat={scenario.boat}
            environment={scenario.environment}
            backlightLevel={backlightLevel}
            onToggleBacklight={() => setBacklightLevel((prev) => (prev + 1) % 4)}
          />
        </div>

        <div className="engine-block">
          <div className="engine-header">
            <span className="readout-label">Engine</span>
            <strong>{engineValue}</strong>
          </div>
          <div className="engine-scale" aria-label="Engine kRPM scale">
            <span className="rpm-mark reverse" style={{ left: "8%" }}>rev</span>
            <span className="rpm-mark neutral" style={{ left: "50%" }}>neutral</span>
            <span className="rpm-mark forward" style={{ left: "72%" }}>1</span>
            <span className="rpm-mark forward" style={{ left: "80%" }}>1.5</span>
            <span className="rpm-mark forward" style={{ left: "90%" }}>2</span>
            <span className="engine-pointer" style={{ left: `${enginePosition}%` }} />
          </div>
        </div>

        <div className="winch-bank">
          <div className="winch-card" tabIndex={0} aria-label="Port winch controls">
            <span className="readout-label">Port winch</span>
            <div className="rope-preview pattern-blue" aria-hidden="true" />
            <strong>Genoa sheet</strong>
            <div className="winch-tooltip">
              {["Genoa sheet port", "Main sheet", "Boom vang"].map((name) => {
                const rope = ropeOptions.find((option) => option.name === name);
                if (!rope) return null;
                return (
                  <div key={rope.name} className="rope-item">
                    <span className={`rope-swatch ${rope.swatch}`} aria-hidden="true" />
                    <span>{rope.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="winch-card" tabIndex={0} aria-label="Starboard winch controls">
            <span className="readout-label">Starboard winch</span>
            <div className="rope-preview pattern-red" aria-hidden="true" />
            <strong>Main halyard</strong>
            <div className="winch-tooltip">
              {["Main halyard", "Boom vang", "Main sheet", "Reefing line 1"].map((name) => {
                const rope = ropeOptions.find((option) => option.name === name);
                if (!rope) return null;
                return (
                  <div key={`${rope.name}-starboard`} className="rope-item">
                    <span className={`rope-swatch ${rope.swatch}`} aria-hidden="true" />
                    <span>{rope.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}

function normalizeDegrees(value: number) {
  let normalized = value % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
