import React from "react";
import type { MarineEntity, BoatState } from "../sim/types";
import { projectEntity } from "../sim/projection";

interface MarineEntitiesProps {
  entities: MarineEntity[];
  boat: BoatState;
  viewHeading: number; // The skipper's absolute looking heading direction
}

/**
 * Component that projects and renders 2.5D visual representations of IALA Region A buoys
 * and moving background vessels within the cockpit's visual Field of View (FOV).
 */
export function MarineEntities({ entities, boat, viewHeading }: MarineEntitiesProps) {
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

        return (
          <g key={ent.id} transform={`translate(${screenX}, ${screenY}) scale(${scale})`}>
            {isPort && <PortLateralBuoy label={ent.label} />}
            {isStbd && <StarboardLateralBuoy label={ent.label} />}
            {isCargo && <CargoVessel label={ent.label} />}
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
        fill="#f4efe7"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.88"
        filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.65))"
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
        fill="#f4efe7"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.88"
        filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.65))"
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
        fill="#f4efe7"
        fontSize="5.5"
        fontWeight="900"
        textAnchor="middle"
        opacity="0.88"
        filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.65))"
      >
        {label || "CARGO"}
      </text>
    </g>
  );
}
