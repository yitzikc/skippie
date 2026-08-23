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
  mainHoistIssue: "none" | "sail-luffing" | "halyard-tangle";
  genoaFurled: boolean;
  genoaTack: "port" | "starboard";

  // Physics State Variables
  heelDeg: number;
  leewayDeg: number;
  apparentWindAngleDeg: number;
  apparentWindSpeedKnots: number;
  speedOverGroundKnots: number;
  courseOverGroundDeg: number;
  mainTrim: number;
  genoaTrim: number;
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

export type EntityType =
  | "buoy_lateral_port"        // Red Can (IALA A)
  | "buoy_lateral_starboard"   // Green Cone (IALA A)
  | "buoy_cardinal_north"
  | "vessel_cargo"             // Cargo ship in background
  | "vessel_yacht";            // Background yacht

export type MarineEntity = {
  id: string;
  type: EntityType;
  x: number;       // absolute East (meters)
  y: number;       // absolute North (meters)
  headingDeg?: number;
  speedKnots?: number;
  label?: string;
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
  entities?: MarineEntity[]; // Buoys and background vessels
  commandCount: number;
  completed: boolean;
};

export type SkipperCommand = {
  raw: string;
  intent:
    | "brief"
    | "assign"
    | "helm_head_to_wind"
    | "helm_port"
    | "helm_starboard"
    | "helm_leeward"
    | "helm_windward"
    | "ask_mast_status"
    | "ask_helm_status"
    | "prepare_main"
    | "hoist_main"
    | "abort"
    | "ask_report"
    | "unknown";
  targetRole?: CrewRole;
  clarity: number;
};
