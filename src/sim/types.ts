export type CrewRole = "helm" | "bow" | "mast" | "cockpit" | "floater";

export type CrewMember = {
  id: string;
  name: string;
  role: CrewRole;
  task: string;
  experience: number;
  fatigue: number;
  attention: number;
  confidence: number;
  position: "cockpit" | "companionway" | "mast" | "foredeck";
  communicationQuality: number;
};

export type BoatState = {
  x: number;
  y: number;
  headingDeg: number;
  speedKnots: number;
  angularVelocity: number;
  momentum: number;
  engine: "off" | "idle" | "ahead" | "astern";
  rudderAngleDeg: number;
  bowThruster: "off" | "port" | "starboard";
  anchor: "stowed" | "ready" | "deployed";
  mainsail: "down" | "preparing" | "hoisting" | "raised" | "lowering";
  genoaFurled: boolean;
  genoaTack: "port" | "starboard";
};

export type EnvironmentState = {
  windDirectionDeg: number;
  windStrengthKnots: number;
  gustKnots: number;
  tidalCurrentDirectionDeg: number;
  tidalCurrentKnots: number;
  visibility: "clear" | "hazy" | "poor";
};

export type SimEventKind =
  | "command"
  | "crew"
  | "observation"
  | "score"
  | "risk"
  | "system";

export type SimEvent = {
  id: string;
  timeSec: number;
  kind: SimEventKind;
  message: string;
  impact?: number;
};

export type ScoreState = {
  situationalAwareness: number;
  workloadDistribution: number;
  communicationClarity: number;
  proceduralCompliance: number;
  safetyMargin: number;
};

export type ScenarioState = {
  id: string;
  title: string;
  objective: string;
  timeSec: number;
  boat: BoatState;
  environment: EnvironmentState;
  crew: CrewMember[];
  score: ScoreState;
  events: SimEvent[];
  commandCount: number;
  completed: boolean;
};

export type SkipperCommand = {
  raw: string;
  intent:
    | "brief"
    | "assign"
    | "helm_head_to_wind"
    | "prepare_main"
    | "hoist_main"
    | "abort"
    | "ask_report"
    | "unknown";
  targetRole?: CrewRole;
  clarity: number;
};
