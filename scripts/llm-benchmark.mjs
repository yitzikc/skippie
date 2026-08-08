#!/usr/bin/env node

const DEFAULT_ENDPOINT = process.env.SKIPPIE_MLX_BASE_URL ?? "http://localhost:8080/v1/chat/completions";
const DEFAULT_MODEL = process.env.SKIPPIE_MLX_MODEL ?? "mlx-community/Qwen3-8B-4bit";

const cases = [
  {
    id: "brief-before-manoeuvre",
    label: "Brief before setting up the mainsail",
    state: {
      scenario: "Raise the mainsail",
      objective: "Coordinate crew, keep the yacht head to wind, and raise the mainsail without overloading yourself.",
      windDirectionDeg: 358,
      windStrengthKnots: 13,
      boatHeadingDeg: 18,
      mainsail: "down",
      crew: ["Maya", "Tom", "Elena"],
    },
    instruction:
      "You are helping a skipper in a sailing simulator. Draft a short crew brief before the mainsail is raised.",
    expectedTerms: ["tom", "maya", "elena", "brief", "confirm", "ready", "hold", "head"],
    bannedTerms: ["mainsail is already raised", "wind is calm", "engine at full power"],
  },
  {
    id: "crew-assign-main-halyard",
    label: "Assign work to a specific crew member",
    state: {
      scenario: "Raise the mainsail",
      objective: "Coordinate crew, keep the yacht head to wind, and raise the mainsail without overloading yourself.",
      windDirectionDeg: 358,
      windStrengthKnots: 13,
      boatHeadingDeg: 18,
      mainsail: "down",
      crew: ["Maya", "Tom", "Elena"],
    },
    instruction:
      "Draft a concise command to Tom for preparing the main halyard while Maya keeps the yacht head to wind.",
    expectedTerms: ["tom", "prepare", "main", "halyard", "confirm", "maya", "head to wind"],
    bannedTerms: ["tom has already raised the main", "engine is astern", "elena is on the mainsheet"],
  },
  {
    id: "abort-safely",
    label: "Abort the manoeuvre safely",
    state: {
      scenario: "Raise the mainsail",
      objective: "Coordinate crew, keep the yacht head to wind, and raise the mainsail without overloading yourself.",
      windDirectionDeg: 358,
      windStrengthKnots: 13,
      boatHeadingDeg: 18,
      mainsail: "down",
      crew: ["Maya", "Tom", "Elena"],
    },
    instruction:
      "The skipper needs to abort the manoeuvre safely. Produce the briefest command sequence that keeps the boat safe and delegates clearly.",
    expectedTerms: ["abort", "hold", "stop", "confirm", "report", "tom", "maya", "elena"],
    bannedTerms: ["ignore the wind", "continue the manoeuvre", "declare the boat safe"],
  },
  {
    id: "debrief-after-run",
    label: "Coach debrief after a manoeuvre",
    state: {
      scenario: "Raise the mainsail",
      objective: "Coordinate crew, keep the yacht head to wind, and raise the mainsail without overloading yourself.",
      windDirectionDeg: 358,
      windStrengthKnots: 13,
      boatHeadingDeg: 18,
      mainsail: "down",
      crew: ["Maya", "Tom", "Elena"],
      recentEvents: ["Scenario loaded", "Crew brief issued", "Mainsail still down"],
    },
    instruction:
      "Give a calm, specific debrief that notes what went well, what nearly caused a problem, and one repeatable improvement.",
    expectedTerms: ["what went well", "nearly", "repeat", "improve", "brief", "crew", "safety"],
    bannedTerms: ["the scenario was perfect", "all crew acted perfectly", "there was no risk"],
  },
];

const args = parseArgs(process.argv.slice(2));

async function main() {
  const endpoint = args.endpoint ?? DEFAULT_ENDPOINT;
  const model = args.model ?? DEFAULT_MODEL;

  if (args.help) {
    printHelp();
    return;
  }

  console.log(`Running Skippie LLM benchmark against ${endpoint} using model ${model}`);

  const results = [];
  for (const item of cases) {
    const startedAt = performanceNow();
    const response = await callModel(endpoint, model, item);
    const latencyMs = performanceNow() - startedAt;

    if (!response.available) {
      console.error(`\nBenchmark skipped for ${item.id}: ${response.text}`);
      results.push({
        ...item,
        status: "skipped",
        reason: response.text,
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
      continue;
    }

    const score = scoreCase(item, response.text);
    results.push({
      ...item,
      status: score.pass ? "pass" : "fail",
      score: score.value,
      response: response.text,
      notes: score.notes,
      latencyMs,
      promptTokens: response.promptTokens ?? 0,
      completionTokens: response.completionTokens ?? 0,
      totalTokens: response.totalTokens ?? 0,
    });
  }

  printSummary(results);
  printMachineReadableSummary(results, endpoint, model);

  const failedCount = results.filter((entry) => entry.status === "fail").length;
  const skippedCount = results.filter((entry) => entry.status === "skipped").length;

  if (failedCount > 0) {
    process.exitCode = 1;
  }

  if (skippedCount === results.length) {
    console.error("\nNo benchmark results were produced because the local LLM endpoint is unavailable.");
    process.exitCode = 1;
  }
}

async function callModel(endpoint, model, item) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 240,
        messages: [
          {
            role: "system",
            content:
              "You are a calm sailing crew coordinator and coach. Remain grounded in the provided scenario data. Never invent wind, vessel, or crew state. Use short, clear, nautical language. Never claim a task is complete unless it is explicit in the scenario.",
          },
          {
            role: "user",
            content: JSON.stringify({
              scenario: item.state,
              instruction: item.instruction,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    const text = extractCompletionText(body);

    if (!text) {
      throw new Error("empty response");
    }

    return {
      available: true,
      text,
      promptTokens: body.usage?.prompt_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
      totalTokens: body.usage?.total_tokens ?? 0,
    };
  } catch (error) {
    return {
      available: false,
      text: `Local LLM is not reachable at ${endpoint}. Start the local model first with \`npm run dev:llm\` or \`mlx_lm.server --model <model>\`.`,
    };
  }
}

function extractCompletionText(body) {
  const message = body?.choices?.[0]?.message;
  if (!message) return "";

  if (typeof message.content === "string") return message.content.trim();
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : part?.text ?? ""))
      .join(" ")
      .trim();
  }
  if (typeof message.reasoning === "string") return message.reasoning.trim();

  return "";
}

function scoreCase(item, text) {
  const normalized = text.toLowerCase();
  const checks = [
    {
      name: "grounded",
      ok: !item.bannedTerms.some((term) => normalized.includes(term.toLowerCase())),
      weight: 0.35,
    },
    {
      name: "role-clarity",
      ok: item.expectedTerms.some((term) => normalized.includes(term.toLowerCase())),
      weight: 0.2,
    },
    {
      name: "clarity",
      ok: normalized.length > 18 && normalized.length < 260,
      weight: 0.15,
    },
    {
      name: "safety",
      ok: /(confirm|report|hold|abort|ready|stop|brief)/.test(normalized),
      weight: 0.15,
    },
    {
      name: "procedural-realism",
      ok: /(tom|maya|elena|crew|brief|debrief|abort|report|hold)/.test(normalized),
      weight: 0.15,
    },
  ];

  const value = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0) * 100;
  const notes = checks.filter((check) => !check.ok).map((check) => check.name);
  const pass = value >= 70 && notes.length === 0 ? true : value >= 70 && !notes.includes("grounded");

  return { value: Number(value.toFixed(0)), pass, notes };
}

function printSummary(results) {
  console.log("\nBenchmark summary");
  console.log("-".repeat(80));

  for (const entry of results) {
    if (entry.status === "skipped") {
      console.log(`SKIP  ${entry.id}: latency=${entry.latencyMs.toFixed(0)}ms ${entry.reason}`);
      continue;
    }

    console.log(
      `${entry.status.toUpperCase().padEnd(5, " ")} ${entry.id}: score=${entry.score}/100 latency=${entry.latencyMs.toFixed(0)}ms tokens=${entry.totalTokens} ${entry.notes.length ? `warnings=${entry.notes.join(", ")}` : "warnings=none"}`
    );
    console.log(`      ${entry.response.slice(0, 180).replace(/\s+/g, " ")}`);
  }

  const passCount = results.filter((entry) => entry.status === "pass").length;
  const avgLatency = results.filter((entry) => entry.status !== "skipped").reduce((sum, entry) => sum + entry.latencyMs, 0) / Math.max(1, results.filter((entry) => entry.status !== "skipped").length);
  const avgTokens = results.filter((entry) => entry.status !== "skipped").reduce((sum, entry) => sum + entry.totalTokens, 0) / Math.max(1, results.filter((entry) => entry.status !== "skipped").length);

  console.log("\nAggregate metrics");
  console.log(`passes=${passCount}/${results.length} average_latency_ms=${avgLatency.toFixed(0)} average_tokens=${avgTokens.toFixed(0)}`);
}

function printMachineReadableSummary(results, endpoint, model) {
  const payload = {
    model,
    endpoint,
    generatedAt: new Date().toISOString(),
    results: results.map((entry) => ({
      id: entry.id,
      status: entry.status,
      score: entry.score ?? 0,
      latencyMs: Number(entry.latencyMs?.toFixed(0) ?? 0),
      promptTokens: entry.promptTokens ?? 0,
      completionTokens: entry.completionTokens ?? 0,
      totalTokens: entry.totalTokens ?? 0,
      warnings: entry.notes ?? [],
      reason: entry.reason ?? null,
    })),
  };

  console.log("\nJSON summary");
  console.log(JSON.stringify(payload, null, 2));
}

function performanceNow() {
  const [seconds, nanoseconds] = process.hrtime();
  return seconds * 1000 + nanoseconds / 1_000_000;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--endpoint") result.endpoint = argv[index + 1];
    else if (arg === "--model") result.model = argv[index + 1];
  }
  return result;
}

function printHelp() {
  console.log(`Skippie LLM benchmark

Usage:
  node scripts/llm-benchmark.mjs [--endpoint http://localhost:8080/v1/chat/completions] [--model mlx-community/Qwen3-8B-4bit]

This benchmark checks whether the local LLM stays grounded, clear, and safe in crew-briefing, assignment, abort, and debrief scenarios.
`);
}

main().catch((error) => {
  console.error("Benchmark failed unexpectedly:", error);
  process.exit(1);
});
