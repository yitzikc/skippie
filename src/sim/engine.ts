import { parseSkipperCommand } from "./commands";
import type { ScenarioState, SimEvent, SkipperCommand } from "./types";
import { evaluateYacht, calculateApparentWind, beneteau367 } from "./physics";

export function cloneScenario(state: ScenarioState): ScenarioState {
  return structuredClone(state);
}

export function tickScenario(state: ScenarioState, deltaSec = 4): ScenarioState {
  const next = cloneScenario(state);
  next.timeSec += deltaSec;

  const windError = smallestAngle(next.boat.headingDeg, next.environment.windDirectionDeg);

  // Turn authority scales with boat speed (steerageway)
  const rudderAuthority = next.boat.speedKnots > 0.5 ? Math.min(1.5, next.boat.speedKnots / 3.0) : 0;
  next.boat.angularVelocity = windError * 0.006 + next.boat.rudderAngleDeg * 0.003 * rudderAuthority;
  next.boat.headingDeg = normalizeHeading(next.boat.headingDeg + next.boat.angularVelocity * deltaSec);

  // Map discrete engine settings to target RPM
  let engineRpm = 0;
  if (next.boat.engine === "idle") {
    engineRpm = 800;
  } else if (next.boat.engine === "ahead") {
    engineRpm = 1500;
  } else if (next.boat.engine === "astern") {
    engineRpm = 1500;
  }

  // Calculate current true wind angle relative to boat heading
  const twa = smallestAngle(next.boat.headingDeg, next.environment.windDirectionDeg);

  // Calculate steady state targets
  const target = evaluateYacht(beneteau367, {
    tws: next.environment.windStrengthKnots,
    twa: twa,
    mainTrim: next.boat.mainTrim ?? 0.5,
    genoaTrim: next.boat.genoaTrim ?? 0.5,
    mainsailRaised: next.boat.mainsail === "raised",
    genoaRaised: !next.boat.genoaFurled,
    engineRpm: engineRpm,
    rudderAngle: next.boat.rudderAngleDeg,
    currentSpeed: next.environment.tidalCurrentKnots,
    currentDir: smallestAngle(next.boat.headingDeg, next.environment.tidalCurrentDirectionDeg)
  });

  // Apply analytical first-order lag filters for inertia and absolute stability
  const rateStw = 0.5; // Inertia for speed
  const rateHeel = 2.0; // Fast response for heel
  const rateLeeway = 1.0; // Moderate response for leeway

  next.boat.speedKnots = target.stw + (next.boat.speedKnots - target.stw) * Math.exp(-rateStw * deltaSec);
  next.boat.heelDeg = target.heel + (next.boat.heelDeg - target.heel) * Math.exp(-rateHeel * deltaSec);
  next.boat.leewayDeg = target.leeway + (next.boat.leewayDeg - target.leeway) * Math.exp(-rateLeeway * deltaSec);

  // Recompute apparent wind and ground motion vectors based on current smoothed states
  const currentWindAndSog = calculateApparentWind(
    next.environment.windStrengthKnots,
    twa,
    next.boat.speedKnots,
    next.boat.leewayDeg,
    next.environment.tidalCurrentKnots,
    smallestAngle(next.boat.headingDeg, next.environment.tidalCurrentDirectionDeg)
  );

  next.boat.apparentWindAngleDeg = currentWindAndSog.awa;
  next.boat.apparentWindSpeedKnots = currentWindAndSog.aws;
  next.boat.speedOverGroundKnots = currentWindAndSog.sog;
  next.boat.courseOverGroundDeg = normalizeHeading(next.boat.headingDeg + currentWindAndSog.cog_rel);

  // Update position using ground motion (SOG and COG)
  next.boat.x += Math.sin((next.boat.courseOverGroundDeg * Math.PI) / 180) * next.boat.speedOverGroundKnots * 0.18;
  next.boat.y -= Math.cos((next.boat.courseOverGroundDeg * Math.PI) / 180) * next.boat.speedOverGroundKnots * 0.18;

  if (Math.abs(windError) > 35 && next.boat.mainsail === "hoisting") {
    next.score.safetyMargin = clampScore(next.score.safetyMargin - 4);
    if (next.boat.mainHoistIssue !== "sail-luffing") {
      next.boat.mainHoistIssue = "sail-luffing";
      next.events.push(event(next, "risk", "The bow is falling off the wind while the main is being hoisted.", -4));
      next.events.push(event(next, "crew", "Tom: The main is luffing halfway up; the halyard is clear, but we are too far off the wind. Maya, should I hold or lower?", -2));
      updateCrewTask(next, "mast", "Holding the mainsail—awaiting a safe heading");
    }
  } else if (next.boat.mainsail === "hoisting" && next.boat.mainHoistIssue === "sail-luffing") {
    next.boat.mainHoistIssue = "none";
    next.events.push(event(next, "crew", "Tom: We are back into the wind and the main is drawing clear. Continuing the hoist.", 4));
    updateCrewTask(next, "mast", "Hoisting mainsail");
  }

  completeHoistIfReady(next);

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
    case "ask_mast_status":
      respondToMastStatus(state);
      break;
    case "ask_helm_status":
      state.events.push(event(state, "observation", `Maya: Heading ${Math.round(state.boat.headingDeg)}°. Wind is ${Math.round(smallestAngle(state.boat.headingDeg, state.environment.windDirectionDeg))}° from the bow.`, 3));
      updateCrewTask(state, "helm", "Reporting heading and wind angle");
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
      state.boat.mainHoistIssue = "none";
      state.score.safetyMargin = clampScore(state.score.safetyMargin + 10);
      state.events.push(event(state, "crew", "Crew stop the manoeuvre and secure loose lines.", 8));
      break;
    case "assign":
      state.score.workloadDistribution = clampScore(state.score.workloadDistribution + 3);
      state.events.push(event(state, "crew", clarificationFor(command.targetRole), 0));
      break;
    case "unknown":
      state.score.communicationClarity = clampScore(state.score.communicationClarity - 5);
      state.events.push(event(state, "crew", "Crew hesitate. The instruction needs to be more specific.", -5));
      break;
  }

}

function completeHoistIfReady(state: ScenarioState) {
  const windError = Math.abs(smallestAngle(state.boat.headingDeg, state.environment.windDirectionDeg));
  if (state.boat.mainsail === "hoisting" && state.boat.mainHoistIssue === "none" && windError <= 25 && state.score.proceduralCompliance > 65 && state.score.safetyMargin > 60) {
    state.boat.mainsail = "raised";
    state.completed = true;
    state.events.push(event(state, "score", "Mainsail raised cleanly. Debrief available.", 12));
  }
}

function respondToMastStatus(state: ScenarioState) {
  const response = state.boat.mainHoistIssue === "halyard-tangle"
    ? "Tom: Yes—the halyard is tangled at the masthead. I need to lower the sail and clear it before we continue."
    : state.boat.mainHoistIssue === "sail-luffing"
      ? "Tom: The halyard is running free. The sail is luffing because we are off the wind; please bring her head to wind."
      : state.boat.mainsail === "hoisting"
        ? "Tom: Halyard is clear and the sail is moving freely. Continuing the hoist."
        : "Tom: Halyard is clear. The main is ready when you are.";
  state.events.push(event(state, "observation", response, 3));
  updateCrewTask(state, "mast", "Reporting mainsail and halyard status");
}

function clarificationFor(role?: string) {
  switch (role) {
    case "helm":
      return "Maya: Please confirm—port, starboard, or head to wind?";
    case "mast":
      return "Tom: Please confirm—prepare the main, hoist, or lower it?";
    case "bow":
      return "Elena: Please confirm what you need me to watch or report.";
    default:
      return "Crew: Please clarify the task and who should take it.";
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
