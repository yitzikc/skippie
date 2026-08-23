import { useState } from "react";
import type { ScenarioState } from "../sim/types";
import { TridataInstrument, WindInstrument } from "./RaymarineInstruments";

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
  const heading = Math.round(scenario.boat.headingDeg);
  const windDir = Math.round(scenario.environment.windDirectionDeg);
  const windSpeed = scenario.environment.windStrengthKnots;
  const engineValue = engineMap[scenario.boat.engine] ?? "IDLE";

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
  const mainSailPath =
    scenario.boat.mainsail === "down"
      ? "M360,172 L360,268 L220,285 L270,176 Z"
      : scenario.boat.mainsail === "preparing"
        ? "M360,158 L360,278 L225,288 L276,165 Z"
        : scenario.boat.mainsail === "hoisting"
          ? "M360,118 L360,280 L220,292 L270,138 Z"
          : scenario.boat.mainsail === "lowering"
            ? "M360,148 L360,278 L228,290 L276,154 Z"
            : "M360,90 L360,282 L220,295 L272,104 Z";
  const jibSailPath =
    scenario.boat.mainsail === "down"
      ? "M225,185 L122,228 L170,96 Z"
      : scenario.boat.mainsail === "preparing"
        ? "M228,188 L136,228 L174,108 Z"
        : scenario.boat.mainsail === "hoisting"
          ? "M232,184 L145,225 L182,82 Z"
          : scenario.boat.mainsail === "lowering"
            ? "M226,186 L132,228 L165,104 Z"
            : "M232,180 L150,226 L184,76 Z";
  const jibTelltaleOpacity = Math.max(0.2, 0.65 + relativeWind / 180);
  const travellerOffset = clamp(Math.round(relativeWind * 0.28 + scenario.boat.rudderAngleDeg * 0.18), -30, 30);
  const apparentWindPointer = ((relativeWind + 180) / 360) * 100;
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

          <div className="helm-indicator" data-state={helmState}>
            <span className="helm-label">Helm</span>
            <div className="helm-track">
              <span className="helm-marker" />
            </div>
          </div>

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
          </defs>

          <path d="M0,240 Q270,180 700,250 L700,420 L0,420 Z" fill="rgba(71,128,138,0.84)" />
          <path d="M0,200 L700,200" stroke="rgba(17, 52, 61, 0.22)" strokeWidth="2" strokeDasharray="8 8" />

          <g transform={`translate(${260 + boomOffset * 0.9} 0)`}>
            <path d="M348,142 L432,82 L448,100 L360,175 Z" fill="#c7d4d2" opacity="0.8" />
            <path d="M360,146 L430,105" stroke="#4f686d" strokeWidth="3" strokeLinecap="round" />
            <path d="M360,148 L300,148" stroke="#4f686d" strokeWidth="4" strokeLinecap="round" />
            <path d="M360,92 L360,282" stroke="#374d57" strokeWidth="8" strokeLinecap="round" opacity="0.9" />
            <path d="M360,92 L360,282" stroke="#dbd1bc" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
            <path d="M360,92 L390,82 L400,94 L360,108 Z" fill="#d9d4cd" opacity="0.9" />
            <path d="M360,95 L334,58 L332,52 L360,70 Z" fill="#dfe5e2" opacity="0.9" />
            <path d="M360,92 L310,62" stroke="#ccc5b7" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8" />
            <path d="M360,92 L420,56" stroke="#b7b2a6" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.8" />
            <path d="M232,182 L155,210" stroke="#dfeae8" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8" />
            <path d="M232,94 L154,210" stroke="#dfeae8" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.8" />
            <path d="M360,92 L382,26" stroke="#dfeae8" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.8" />
            <path
              d={`M360 ${170 + mainSheetAngle * 0.5} Q430 ${164 + mainSheetAngle * 0.4} 505 ${150 + mainSheetAngle * 0.2}`}
              stroke="#f6f4ef"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
              opacity="1"
            />
            <path
              d={`M360 ${170 + mainSheetAngle * 0.5} Q430 ${164 + mainSheetAngle * 0.4} 505 ${150 + mainSheetAngle * 0.2}`}
              stroke="#7b4f46"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.95"
            />
            <path
              d={`M468 ${150 + mainSheetAngle * 0.5} Q435 ${185 + mainSheetAngle * 0.3} 360 ${182 + mainSheetAngle * 0.7}`}
              stroke="#f4efe7"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d={`M470 ${150 + mainSheetAngle * 0.5} Q365 ${198 + mainSheetAngle * 0.5} 292 ${216 + mainSheetAngle * 0.7}`}
              stroke="#9a5547"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <path
              d={`M355 ${172 + travellerOffset * 0.4} Q420 ${164 + travellerOffset * 0.2} 500 ${164 + travellerOffset * 0.1}`}
              stroke="#d3b26d"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
              opacity="0.95"
            />
            <path
              d={`M361 ${172 + travellerOffset * 0.4} Q420 ${170 + travellerOffset * 0.2} 500 ${170 + travellerOffset * 0.1}`}
              stroke="#7c5c2b"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
            <rect x="415" y="140" width="38" height="20" rx="5" fill="#e9e2d5" opacity="0.8" stroke="#4a5b60" strokeWidth="1.5" />
            <path d="M415,150 L453,150" stroke="#3b4d53" strokeWidth="2" strokeLinecap="round" />
            <circle cx="433" cy="150" r="4" fill="#d3b26d" stroke="#4a5b60" strokeWidth="1.2" />
            <text x="505" y="150" fill="#f6f4ef" fontSize="12" fontWeight="700" letterSpacing="1">SHEET</text>
            <text x="500" y="184" fill="#d3b26d" fontSize="11" fontWeight="700" letterSpacing="1">VANG</text>

            <g>
              <path
                d={mainSailPath}
                fill="url(#mainGradient)"
                opacity={scenario.boat.mainsail === "down" ? 0.18 : 0.95}
                transform={`translate(${boomOffset * 0.28} ${-sailLift} ) rotate(${sailTwist} 360 180)`}
              />
              <path d="M360,90 L360,282" stroke="#4c5d64" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M220,285 L272,176" stroke="#4c5d64" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M360,208 L314,256" stroke="#5a6770" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            </g>
          </g>

          <g transform={`translate(${jibOffset * 1.1 + genoaSideOffset} 0)`}>
            <g>
              <path d="M232,184 L232,94" stroke="#dfeae8" strokeWidth="5" strokeLinecap="round" opacity={genoaVisible ? 0.9 : 0} />
              <path d="M232,184 L184,76" stroke="#dfeae8" strokeWidth="4" strokeLinecap="round" opacity={genoaVisible ? 0.75 : 0} />
              <path d="M232,92 L206,44" stroke="#dfeae8" strokeWidth="2.2" strokeLinecap="round" opacity={genoaVisible ? 0.8 : 0} />
              <path
                d={jibSailPath}
                fill="url(#jibGradient)"
                opacity={genoaVisible ? 0.98 : 0}
                transform={`rotate(${jibTrim * 0.7} 180 150)`}
              />
              <path d="M232,184 L165,226" stroke="#4c5d64" strokeWidth="2.4" strokeLinecap="round" opacity={genoaVisible ? 1 : 0} />
              <path d="M232,184 L184,76" stroke="#4c5d64" strokeWidth="2.4" strokeLinecap="round" opacity={genoaVisible ? 1 : 0} />
              <g className="jib-telltales" opacity={genoaVisible ? 0.95 : 0}>
                <path d="M178,112 L195,144" stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                <path d="M186,120 L205,144" stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
                <path d="M192,128 L212,140" stroke={activeTelltaleColor} strokeWidth="2.2" strokeLinecap="round" />
              </g>
              <text x="145" y="112" fill="#f4efe7" fontSize="11" fontWeight="700" letterSpacing="1" opacity={genoaVisible ? 1 : 0}>GENOA</text>
            </g>
          </g>

          <g transform={`translate(0 ${scenario.boat.mainsail === "raised" ? 8 : 28})`}>
            <path d="M160,212 L470,212" stroke="rgba(242,240,233,0.6)" strokeWidth="7" strokeLinecap="round" />
            <path d="M160,212 L490,212" stroke="rgba(18,50,57,0.78)" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M230,212 L230,228 L305,228 L305,212" fill="none" stroke="rgba(18,50,57,0.75)" strokeWidth="2.2" />
            <path d="M322,212 L322,226 L415,226 L415,212" fill="none" stroke="rgba(18,50,57,0.75)" strokeWidth="2.2" />
            <path d="M180,206 L180,218" stroke="#d6e7e7" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
            <path d="M468,206 L468,218" stroke="#d6e7e7" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
          </g>
          <text x="388" y="86" fill="#f4efe7" fontSize="11" fontWeight="800" letterSpacing="1">MAIN</text>

          <g transform={`translate(0 ${scenario.boat.mainsail === "raised" ? 8 : 28})`}>
            <path d="M160,212 L470,212" stroke="rgba(242,240,233,0.6)" strokeWidth="7" strokeLinecap="round" />
            <path d="M160,212 L490,212" stroke="rgba(18,50,57,0.78)" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M230,212 L230,228 L305,228 L305,212" fill="none" stroke="rgba(18,50,57,0.75)" strokeWidth="2.2" />
            <path d="M322,212 L322,226 L415,226 L415,212" fill="none" stroke="rgba(18,50,57,0.75)" strokeWidth="2.2" />
          </g>
        </svg>
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
