import type { LocalAiClient, LocalModel } from "./types";
import type { ScenarioState } from "../sim/types";

export const defaultLocalModels: LocalModel[] = [
  {
    id: "mlx-community/Qwen3-8B-4bit",
    label: "MLX Qwen 3 Instruct 8B",
    provider: "mlx",
    endpoint: "http://localhost:8080/v1/chat/completions",
  },
  {
    id: "mlx-community/Qwen3-4B-4bit",
    label: "MLX small/fast 4B profile",
    provider: "mlx",
    endpoint: "http://localhost:8080/v1/chat/completions",
  },
];

export function createLocalAiClient(model: LocalModel): LocalAiClient {
  return {
    async generateCrewLine(state, prompt) {
      return complete(model, [
        {
          role: "system",
          content:
            "You are sailing crew in a training simulator. Be concise, nautical, and use closed-loop communication. Do not invent physical state.",
        },
        { role: "user", content: JSON.stringify({ state: summarizeState(state), skipperPrompt: prompt }) },
      ]);
    },
    async generateDebrief(state) {
      return complete(model, [
        {
          role: "system",
          content:
            "You are a calm RYA-style sailing coach. Explain what went well, what nearly caused failure, and one exercise to repeat.",
        },
        { role: "user", content: JSON.stringify(summarizeState(state)) },
      ]);
    },
  };
}

async function complete(model: LocalModel, messages: Array<{ role: string; content: string }>) {
  try {
    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.id,
        messages,
        temperature: 0.4,
        max_tokens: 260,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local model returned ${response.status}`);
    }

    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return {
      available: true,
      text: body.choices?.[0]?.message?.content?.trim() || "The local model returned an empty response.",
    };
  } catch {
    return {
      available: false,
      text:
        "Local LLM is not connected yet. Start MLX with `mlx_lm.server --model <model>` and keep using deterministic sim mode in the meantime.",
    };
  }
}

function summarizeState(state: ScenarioState) {
  return {
    scenario: state.title,
    objective: state.objective,
    timeSec: state.timeSec,
    boat: state.boat,
    environment: state.environment,
    crew: state.crew.map(({ name, role, task, attention, confidence, communicationQuality }) => ({
      name,
      role,
      task,
      attention,
      confidence,
      communicationQuality,
    })),
    score: state.score,
    recentEvents: state.events.slice(-8),
  };
}
