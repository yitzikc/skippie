import React from "react";
import type { MarineEntity, BoatState } from "../sim/types";
import { projectEntity } from "../sim/projection";

interface MarineEntitiesProps {
  entities: MarineEntity[];
  boat: BoatState;
  viewHeading: number; // The skipper's absolute looking heading direction
  windDirectionDeg: number; // True wind direction in the environment
}

/**
 * Component that projects and renders 2.5D visual representations of IALA Region A buoys
 * and moving background vessels within the cockpit's visual Field of View (FOV).
 */
export function MarineEntities({ entities, boat, viewHeading, windDirectionDeg }: MarineEntitiesProps) {
  // Trigonometric camera projection mapping world coordinates (x, y) to viewport coordinates (X, Y)
  const projectedEntities = entities
    .map((ent) => {
      const proj = projectEntity(ent.x, ent.y, boat.x, boat.y, viewHeading);
      if (!proj.visible) return null;
      return { ent, screenX: proj.screenX, screenY: proj.screenY, scale: proj.scale };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <g className="projected-marine-entities" aria-hidden="true">
      {projectedEntities.map(({ ent, screenX, screenY, scale }) => {
        const isPort = ent.type === "buoy_lateral_port";
        const isStbd = ent.type === "buoy_lateral_starboard";
        const isCargo = ent.type === "vessel_cargo";
        const isYacht = ent.type === "vessel_yacht";

        return (
          <g key={ent.id} transform={`translate(${screenX}, ${screenY}) scale(${scale})`}>
            {isPort && <PortLateralBuoy label={ent.label} />}
            {isStbd && <StarboardLateralBuoy label={ent.label} />}
            {isCargo && <CargoVessel label={ent.label} />}
            {isYacht && <YachtVessel ent={ent} windDir={windDirectionDeg} />}
          </g>
        );
      })}
    </g>
  );
}

/**
 * 1. IALA Region A Port Lateral Buoy (Red cylindrical can)
 */
function PortLateralBuoy({ label }: { label?: string }) {
  return (
    <g className="entity-port-buoy">
      {/* Dynamic buoy water shadow */}
      <ellipse cx="0" cy="1" rx="5" ry="1.5" fill="rgba(18,50,57,0.25)" />
      {/* Pillar Can Body */}
      <rect
        x="-4.5"
        y="-14"
        width="9"
        height="14"
        fill="#cf3b3b"
        stroke="#7e1f1f"
        strokeWidth="0.8"
        rx="0.8"
      />
      {/* Retro white band marking */}
      <rect x="-4.5" y="-9" width="9" height="4" fill="#ffffff" opacity="0.85" />
      {/* Topmark spindle */}
      <line x1="0" y1="-14" x2="0" y2="-20" stroke="#1c2022" strokeWidth="0.8" />
      {/* Red cylindrical Can Topmark */}
      <rect x="-3.5" y="-25" width="7" height="5" fill="#cf3b3b" stroke="#7e1f1f" strokeWidth="0.6" />
      {/* Distant-dependent text label */}
      <text
        x="0"
        y="8.5"
        fill="#123239"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.95"
        filter="drop-shadow(0px 0.8px 1px #ffffff)"
      >
        {label || "PORT"}
      </text>
    </g>
  );
}

/**
 * 2. IALA Region A Starboard Lateral Buoy (Green conical cone)
 */
function StarboardLateralBuoy({ label }: { label?: string }) {
  return (
    <g className="entity-stbd-buoy">
      {/* Dynamic buoy shadow */}
      <ellipse cx="0" cy="1" rx="5" ry="1.5" fill="rgba(18,50,57,0.25)" />
      {/* Conical Body */}
      <polygon points="0,-14 -5.5,0 5.5,0" fill="#2eb151" stroke="#1b6e31" strokeWidth="0.8" />
      {/* Conical Green Topmark */}
      <line x1="0" y1="-14" x2="0" y2="-20" stroke="#1c2022" strokeWidth="0.8" />
      <polygon points="0,-25 -3.5,-20 3.5,-20" fill="#2eb151" stroke="#1b6e31" strokeWidth="0.6" />
      {/* Distant text label */}
      <text
        x="0"
        y="8.5"
        fill="#123239"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.95"
        filter="drop-shadow(0px 0.8px 1px #ffffff)"
      >
        {label || "STBD"}
      </text>
    </g>
  );
}

/**
 * 3. Moving Cargo Vessel (Superstructure hull with container stacks and port light)
 */
function CargoVessel({ label }: { label?: string }) {
  return (
    <g className="entity-cargo-vessel">
      {/* Flowing water wake */}
      <path d="M -22,1.5 L 22,1.5 L 25,2 L -25,2 Z" fill="rgba(255,255,255,0.4)" />
      {/* Rust-red ship hull */}
      <polygon points="-24,-5 24,-5 20,1 -20,1" fill="#7d3429" stroke="#3e1a14" strokeWidth="0.8" />
      {/* Black deck line */}
      <rect x="-24" y="-7" width="48" height="2" fill="#1b1d1f" />
      {/* Stern bridge superstructure tower */}
      <rect x="-22" y="-16" width="10" height="9" fill="#f4efe7" stroke="#3e1a14" strokeWidth="0.6" />
      {/* Windows bridge */}
      <rect x="-20" y="-12" width="6" height="3" fill="#3b4d53" />
      {/* Stacked containers on deck in cargo block profiles */}
      <rect x="-10" y="-12" width="8" height="5" fill="#3b699a" opacity="0.9" />
      <rect x="-1" y="-14" width="9" height="7" fill="#8a9840" opacity="0.9" />
      <rect x="9" y="-11" width="8" height="4" fill="#bf743d" opacity="0.9" />
      {/* Glowing Port red navigation light (facing skipper as ship moves south) */}
      <circle cx="-13" cy="-10" r="1.5" fill="#ef3b3b" filter="drop-shadow(0 0 3px #ef3b3b)" />
      {/* Visual nameplate tag */}
      <text
        x="0"
        y="7.5"
        fill="#123239"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.95"
        filter="drop-shadow(0px 0.8px 1px #ffffff)"
      >
        {label || "CARGO"}
      </text>
    </g>
  );
}

/**
 * 4. High-Fidelity Yacht Vessel
 * Renders hull profiles, dynamic tacks (sails billowed lee), heeling directions,
 * backed Genoa (heave-to windward sheeting), daytime motoring cones, and anchor balls.
 */
function YachtVessel({ ent, windDir }: { ent: MarineEntity; windDir: number }) {
  const state = ent.vesselState || "sailing";
  const heading = ent.headingDeg || 0;

  // Compute true wind angle (TWA) relative to boat heading
  // twa ranges from -180 to 180.
  // Positive twa means wind from starboard, boat heels port.
  // Negative twa means wind from port, boat heels starboard.
  let twa = (windDir - heading) % 360;
  if (twa > 180) twa -= 360;
  if (twa < -180) twa += 360;

  const isStarboardWind = twa >= 0;

  // Determine sail states
  const mainRaised = ent.mainsailState === "raised" || (state === "sailing" || state === "motor_sailing" || state === "heaving_to");
  const jibRaised = ent.jibState === "raised" || (state === "sailing" || state === "motor_sailing" || state === "heaving_to");
  const isJibBacked = state === "heaving_to";

  // Sails billow lee
  // If wind from starboard (positive), sails swing left/port (negative)
  const mainDeflect = isStarboardWind ? -9 : 9;
  const jibDeflect = isJibBacked
    ? (isStarboardWind ? 9 : -9)   // Backed Genoa: sheeted windward!
    : (isStarboardWind ? -9 : 9);  // Standard Genoa: sheeted leeward

  // Dynamic Yacht Heel leeward
  let heel = ent.heelDeg;
  if (heel === undefined) {
    if (state === "sailing") {
      heel = isStarboardWind ? -12 : 12;
    } else if (state === "motor_sailing") {
      heel = isStarboardWind ? -6 : 6;
    } else if (state === "heaving_to") {
      heel = isStarboardWind ? -15 : 15;
    } else {
      heel = 0; // Motoring/Anchored are flat
    }
  }

  // Motoring & Anchored signal marks (extensible for lights later!)
  const motoringSignal = ent.motoringSignalActive || (state === "motor_sailing" || state === "motoring");
  const anchoredSignal = ent.anchoredSignalActive || state === "anchored";

  return (
    <g className="entity-yacht-vessel" transform={`rotate(${heel} 0 0)`}>
      {/* Wake/water shadow */}
      <ellipse cx="0" cy="1" rx="9" ry="2.5" fill="rgba(18,50,57,0.2)" />

      {/* Sleek fiberglass yacht hull profile */}
      <path d="M -11,-3 Q -8,1.2 0,1.8 Q 8,1.2 11,-3 L 10,-5 L -10,-5 Z" fill="#fdfdfd" stroke="#373a3c" strokeWidth="0.8" />
      {/* Decorative dark blue hull stripe */}
      <path d="M -10.5,-4.2 L 10.5,-4.2 L 10,-5 L -10,-5 Z" fill="#284653" />

      {/* Aluminum rigging mast */}
      <line x1="0" y1="-5" x2="0" y2="-28" stroke="#788185" strokeWidth="1" />

      {/* Genoa Jib (hoisted first so Mainsail can realistically overlap and obscure it!) */}
      {jibRaised && (
        <path
          d={`M 8,-6 L 0,-27 Q ${(8 + jibDeflect)/2},${(-6 - 27)/2 + 2} ${jibDeflect}, -6 Z`}
          fill="rgba(242, 237, 230, 0.94)"
          stroke="#938b80"
          strokeWidth="0.5"
        />
      )}

      {/* Mainsail (hoisted after, sits on top in visual depth!) */}
      {mainRaised && (
        <path
          d={`M 0,-6 L 0,-27 Q ${mainDeflect * 0.75},${(-6 - 27)/2} ${mainDeflect}, -6 Z`}
          fill="rgba(245, 240, 232, 0.95)"
          stroke="#a49382"
          strokeWidth="0.5"
        />
      )}

      {/* Daytime Motoring black cone signal (pointing down) */}
      {motoringSignal && (
        <g transform="translate(4, -18)">
          <polygon points="0,3.5 -2.5,-1.5 2.5,-1.5" fill="#111213" stroke="#000" strokeWidth="0.4" />
        </g>
      )}

      {/* Daytime Anchored black ball signal */}
      {anchoredSignal && (
        <g transform="translate(6, -15)">
          <circle cx="0" cy="0" r="2" fill="#111213" stroke="#000" strokeWidth="0.4" />
        </g>
      )}

      {/* Yacht nameplate/classification tag */}
      <text
        x="0"
        y="8.5"
        fill="#123239"
        fontSize="5.2"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.95"
        filter="drop-shadow(0px 0.8px 1px #ffffff)"
      >
        {ent.label || `Yacht (${state.replace("_", "-")})`}
      </text>
    </g>
  );
}
