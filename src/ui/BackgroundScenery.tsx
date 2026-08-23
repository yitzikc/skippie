import React from "react";
import { normalizeDegrees } from "../sim/projection";

interface BackgroundSceneryProps {
  heading: number;
}

// Gyroscopic 2.5D background landscape peaks (absolute world headings)
const landPeaks = [
  { bearingAbs: 350, height: 26, width: 140, label: "North Head" },
  { bearingAbs: 300, height: 16, width: 180, label: "West Shoreline" },
  { bearingAbs: 55, height: 20, width: 110, label: "East Spit" },
  { bearingAbs: 180, height: 12, width: 160, label: "South Bar" },
];

// Gyroscopic background clouds (absolute world headings)
const skyClouds = [
  { bearingAbs: 335, y: 55, scaleX: 1.3, scaleY: 0.8 },
  { bearingAbs: 15, y: 70, scaleX: 1.6, scaleY: 0.95 },
  { bearingAbs: 65, y: 40, scaleX: 1.0, scaleY: 0.7 },
  { bearingAbs: 295, y: 60, scaleX: 1.4, scaleY: 0.8 },
];

/**
 * Component that renders gyroscopic 2.5D visual representations of sky clouds
 * and land contours. They slide and yaw in perfect real-time synchrony with the
 * yacht's compass heading, giving the player instant feedback during maneuvers.
 */
export function BackgroundScenery({ heading }: BackgroundSceneryProps) {
  // Project background land contours
  const projectedLand = landPeaks
    .map((peak) => {
      const bearingRel = normalizeDegrees(peak.bearingAbs - heading);
      if (Math.abs(bearingRel) > 36) return null; // FOV boundary clipping
      const screenX = 350 + (bearingRel / 32) * 350;
      return { ...peak, screenX };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Project background sky clouds
  const projectedClouds = skyClouds
    .map((cloud, index) => {
      const bearingRel = normalizeDegrees(cloud.bearingAbs - heading);
      if (Math.abs(bearingRel) > 36) return null; // FOV boundary clipping
      const screenX = 350 + (bearingRel / 32) * 350;
      return { ...cloud, screenX, id: index };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <g className="scenery-background" aria-hidden="true">
      {/* 1. Gyroscopic 2.5D Background Clouds */}
      {projectedClouds.map((cloud) => (
        <g
          key={cloud.id}
          opacity="0.45"
          transform={`translate(${cloud.screenX}, ${cloud.y}) scale(${cloud.scaleX} ${cloud.scaleY})`}
        >
          <ellipse cx="-16" cy="0" rx="22" ry="10" fill="#ffffff" />
          <ellipse cx="16" cy="0" rx="22" ry="10" fill="#ffffff" />
          <circle cx="0" cy="-5" r="14" fill="#ffffff" />
        </g>
      ))}

      {/* 2. Gyroscopic 2.5D Background Land Contours */}
      {projectedLand.map((peak) => (
        <path
          key={peak.bearingAbs}
          d={`M ${peak.screenX - peak.width},200 Q ${peak.screenX},${200 - peak.height} ${
            peak.screenX + peak.width
          },200 Z`}
          fill="#6b7c80"
          stroke="#526063"
          strokeWidth="0.8"
          opacity="0.55"
        />
      ))}
    </g>
  );
}
