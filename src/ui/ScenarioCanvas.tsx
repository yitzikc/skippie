import type { ScenarioState } from "../sim/types";

type Props = {
  scenario: ScenarioState;
};

export function ScenarioCanvas({ scenario }: Props) {
  const { boat, environment } = scenario;
  const boatTransform = `translate(${boat.x} ${boat.y}) rotate(${boat.headingDeg})`;
  const windTransform = `rotate(${environment.windDirectionDeg} 82 22)`;

  return (
    <svg className="scenario-canvas" viewBox="0 0 100 100" role="img" aria-label="Top-down sailing scenario view">
      <defs>
        <pattern id="water" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 7 C2 5, 4 5, 6 7 S10 9, 12 7" fill="none" stroke="rgba(7, 71, 92, 0.16)" strokeWidth="0.35" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#water)" />
      <path d="M4 78 C18 72, 24 86, 39 80 C51 75, 66 83, 96 74 L96 100 L4 100 Z" fill="#d6c08a" opacity="0.8" />
      <path d="M7 18 L36 18 L36 25 L7 25 Z M66 72 L93 72 L93 78 L66 78 Z" fill="#284653" opacity="0.82" />
      <g transform={windTransform}>
        <path d="M82 10 L82 34" stroke="#11343d" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M82 10 L76 18 M82 10 L88 18" stroke="#11343d" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <g transform={boatTransform}>
        <path d="M0 -10 C5 -7, 6 4, 0 12 C-6 4, -5 -7, 0 -10 Z" fill="#f8f4e8" stroke="#14343b" strokeWidth="1" />
        <path d="M0 -7 L0 9" stroke="#14343b" strokeWidth="0.8" />
        <path d="M0 -5 L10 7" stroke={boat.mainsail === "raised" ? "#d35e3f" : "#9ba7a9"} strokeWidth="0.8" />
        <circle cx="0" cy="-7" r="1.5" fill="#d35e3f" />
      </g>
      <circle cx="45" cy="26" r="2.3" fill="#f1b84b" />
      <path d="M43 26 C39 28, 37 30, 34 34" stroke="#f1b84b" strokeWidth="0.6" strokeDasharray="1 1" fill="none" />
    </svg>
  );
}
