import type { ScenarioState } from "../sim/types";

export type LocalModel = {
  id: string;
  label: string;
  provider: "mlx" | "ollama" | "lm-studio";
  endpoint: string;
};

export type CoachResponse = {
  available: boolean;
  text: string;
};

export type LocalAiClient = {
  generateCrewLine(state: ScenarioState, prompt: string): Promise<CoachResponse>;
  generateDebrief(state: ScenarioState): Promise<CoachResponse>;
};
