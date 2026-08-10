import type { CrewRole, SkipperCommand } from "./types";

const roleWords: Record<CrewRole, string[]> = {
  helm: ["helm", "maya"],
  bow: ["bow", "lookout", "elena", "foredeck"],
  mast: ["mast", "halyard", "tom"],
  cockpit: ["cockpit", "sheets"],
  floater: ["floater", "spare"],
};

export function parseSkipperCommand(raw: string): SkipperCommand {
  const text = raw.trim().toLowerCase();
  const targetRole = findRole(text);
  const clarity = scoreClarity(text, targetRole);

  if (!text) {
    return { raw, intent: "unknown", clarity: 0 };
  }

  if (text.includes("abort") || text.includes("stop the manoeuvre")) {
    return { raw, intent: "abort", clarity };
  }

  if (targetRole === "mast" && isStatusQuestion(text)) {
    return { raw, intent: "ask_mast_status", targetRole, clarity };
  }

  if (targetRole === "helm" && isStatusQuestion(text)) {
    return { raw, intent: "ask_helm_status", targetRole, clarity };
  }

  if (text.includes("brief") || text.includes("plan")) {
    return { raw, intent: "brief", targetRole, clarity };
  }

  if (isHelmInstruction(text) && (text.includes("to port") || text.includes("turn port") || text.includes("port helm"))) {
    return { raw, intent: "helm_port", targetRole: "helm", clarity };
  }

  if (isHelmInstruction(text) && (text.includes("to starboard") || text.includes("turn starboard") || text.includes("starboard helm"))) {
    return { raw, intent: "helm_starboard", targetRole: "helm", clarity };
  }

  if (text.includes("head to wind") || text.includes("into the wind")) {
    return { raw, intent: "helm_head_to_wind", targetRole: targetRole ?? "helm", clarity };
  }

  if (isHelmInstruction(text) && text.includes("leeward")) {
    return { raw, intent: "helm_leeward", targetRole: "helm", clarity };
  }

  if (isHelmInstruction(text) && text.includes("windward")) {
    return { raw, intent: "helm_windward", targetRole: "helm", clarity };
  }

  if (text.includes("prepare") && (text.includes("main") || text.includes("mainsail"))) {
    return { raw, intent: "prepare_main", targetRole: targetRole ?? "mast", clarity };
  }

  if ((text.includes("hoist") || text.includes("raise")) && (text.includes("main") || text.includes("mainsail"))) {
    return { raw, intent: "hoist_main", targetRole: targetRole ?? "mast", clarity };
  }

  if (text.includes("report") || text.includes("distance") || text.includes("traffic")) {
    return { raw, intent: "ask_report", targetRole: targetRole ?? "bow", clarity };
  }

  if (targetRole) {
    return { raw, intent: "assign", targetRole, clarity };
  }

  return { raw, intent: "unknown", clarity };
}

function isHelmInstruction(text: string) {
  return text.includes("helm") || text.includes("maya") || text.includes("steer") || text.includes("turn");
}

function isStatusQuestion(text: string) {
  return text.includes("?") || /\b(is|are|what|why|status|problem|wrong|clear|tangled)\b/.test(text);
}

function findRole(text: string): CrewRole | undefined {
  return Object.entries(roleWords).find(([, words]) => words.some((word) => text.includes(word)))?.[0] as
    | CrewRole
    | undefined;
}

function scoreClarity(text: string, targetRole?: CrewRole): number {
  let score = 0.35;
  if (targetRole) score += 0.2;
  if (text.includes("please") || text.includes("now") || text.includes("ready")) score += 0.1;
  if (text.includes("confirm") || text.includes("report")) score += 0.1;
  if (text.length > 12 && text.length < 120) score += 0.15;
  if (text.includes("maybe") || text.includes("sort of")) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}
