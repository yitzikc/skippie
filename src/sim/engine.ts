import { parseSkipperCommand } from "./commands";
import type { ScenarioState, SimEvent, SkipperCommand } from "./types";

export function cloneScenario(state: ScenarioState): ScenarioState {
  return structuredClone(state);
}

export function tickScenario(state: ScenarioState, deltaSec = 4): ScenarioState {
  const next = cloneScenario(state);
  next.timeSec += deltaSec;

  const windError = smallestAngle(next.boat.headingDeg, next.environment.windDirectionDeg);
  next.boat.angularVelocity = windError * 0.006 + next.boat.rudderAngleDeg * 0.003;
  next.boat.headingDeg = normalizeHeading(next.boat.headingDeg + next.boat.angularVelocity * deltaSec);
  next.boat.x += Math.sin((next.boat.headingDeg * Math.PI) / 180) * next.boat.speedKnots * 0.18;
  next.boat.y -= Math.cos((next.boat.headingDeg * Math.PI) / 180) * next.boat.speedKnots * 0.18;

  if (Math.abs(windError) > 35 && next.boat.mainsail === "hoisting") {
    next.score.safetyMargin = clampScore(next.score.safetyMargin - 4);
    next.events.push(event(next, "risk", "The bow is falling off the wind while the main is being hoisted.", -4));
  }

  return next;
}

export function applyCommand(state: ScenarioState, raw: string): ScenarioState {
  const command = parseSkipperCommand(raw);
  const next = cloneScenario(state);
  next.commandCount += 1;
  next.events.push(event(next, "command", `Skipper: "${raw}"`));
  applyCommandEffects(next, command);
  return tickScenario(next, 3);
}

function applyCommandEffects(state: ScenarioState, command: SkipperCommand) {
  state.score.communicationClarity = clampScore(
    state.score.communicationClarity + Math.round((command.clarity - 0.55) * 14),
  );

  switch (command.intent) {
    case "brief":
      state.score.proceduralCompliance = clampScore(state.score.proceduralCompliance + 8);
      state.score.workloadDistribution = clampScore(state.score.workloadDistribution + 4);
      state.events.push(event(state, "crew", "Crew acknowledge the manoeuvre brief and confirm roles.", 6));
      updateCrewTask(state, "helm", "Ready to keep head to wind");
      updateCrewTask(state, "mast", "Checking halyard and sail ties");
      updateCrewTask(state, "bow", "Maintaining lookout");
      break;
    case "helm_head_to_wind":
      state.boat.rudderAngleDeg = smallestAngle(state.boat.headingDeg, state.environment.windDirectionDeg) > 0 ? 8 : -8;
      state.score.situationalAwareness = clampScore(state.score.situationalAwareness + 5);
      state.events.push(event(state, "crew", "Maya: Head to wind, understood.", 4));
      updateCrewTask(state, "helm", "Steering head to wind");
      break;
    case "helm_port":
      state.boat.rudderAngleDeg = -18;
      state.events.push(event(state, "crew", "Maya: Helm to port, understood.", 4));
      updateCrewTask(state, "helm", "Turning to port");
      break;
    case "helm_starboard":
      state.boat.rudderAngleDeg = 18;
      state.events.push(event(state, "crew", "Maya: Helm to starboard, understood.", 4));
      updateCrewTask(state, "helm", "Turning to starboard");
      break;
    case "helm_leeward":
      state.boat.rudderAngleDeg = smallestAngle(state.boat.headingDeg, state.environment.windDirectionDeg) > 0 ? -12 : 12;
      state.events.push(event(state, "crew", "Maya: Steering away from the wind, understood.", -2));
      updateCrewTask(state, "helm", "Steering leeward");
      break;
    case "helm_windward":
      state.boat.rudderAngleDeg = smallestAngle(state.boat.headingDeg, state.environment.windDirectionDeg) > 0 ? 12 : -12;
      state.events.push(event(state, "crew", "Maya: Steering toward the wind, understood.", 3));
      updateCrewTask(state, "helm", "Steering windward");
      break;
    case "prepare_main":
      state.boat.mainsail = state.boat.mainsail === "down" ? "preparing" : state.boat.mainsail;
      state.score.proceduralCompliance = clampScore(state.score.proceduralCompliance + 5);
      state.events.push(event(state, "crew", "Tom: Main halyard ready. Sail ties checked.", 4));
      updateCrewTask(state, "mast", "Mainsail ready to hoist");
      break;
    case "hoist_main":
      if (state.boat.mainsail === "preparing") {
        state.boat.mainsail = "hoisting";
        state.events.push(event(state, "crew", "Tom: Hoisting main. Keep her steady.", 5));
        updateCrewTask(state, "mast", "Hoisting mainsail");
      } else {
        state.score.proceduralCompliance = clampScore(state.score.proceduralCompliance - 8);
        state.events.push(event(state, "risk", "The hoist was called before the crew had clearly prepared the main.", -8));
      }
      break;
    case "ask_report":
      state.score.situationalAwareness = clampScore(state.score.situationalAwareness + 6);
      state.events.push(event(state, "observation", "Elena: Clear ahead. Ferry wash expected in about two minutes.", 5));
      updateCrewTask(state, "bow", "Reporting traffic and sea room");
      break;
    case "abort":
      state.boat.mainsail = state.boat.mainsail === "raised" ? "raised" : "down";
      state.score.safetyMargin = clampScore(state.score.safetyMargin + 10);
      state.events.push(event(state, "crew", "Crew stop the manoeuvre and secure loose lines.", 8));
      break;
    case "assign":
      state.score.workloadDistribution = clampScore(state.score.workloadDistribution + 3);
      state.events.push(event(state, "crew", "The assigned crew member confirms the instruction.", 2));
      break;
    case "unknown":
      state.score.communicationClarity = clampScore(state.score.communicationClarity - 5);
      state.events.push(event(state, "crew", "Crew hesitate. The instruction needs to be more specific.", -5));
      break;
  }

  if (state.boat.mainsail === "hoisting" && state.score.proceduralCompliance > 65 && state.score.safetyMargin > 60) {
    state.boat.mainsail = "raised";
    state.completed = true;
    state.events.push(event(state, "score", "Mainsail raised cleanly. Debrief available.", 12));
  }
}

function updateCrewTask(state: ScenarioState, role: string, task: string) {
  const crew = state.crew.find((member) => member.role === role);
  if (crew) crew.task = task;
}

function event(state: ScenarioState, kind: SimEvent["kind"], message: string, impact?: number): SimEvent {
  return {
    id: `evt-${state.timeSec}-${state.events.length}`,
    timeSec: state.timeSec,
    kind,
    message,
    impact,
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeHeading(value: number) {
  return (value + 360) % 360;
}

function smallestAngle(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}
