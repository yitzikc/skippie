#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { applyCommand, cloneScenario } from "../src/sim/engine.ts";
import { raiseMainsailScenario } from "../src/sim/scenarios.ts";

const DEFAULT_ITERATIONS = Number(process.env.SKIPPIE_BENCHMARK_ITERATIONS ?? 1000);

const commandCases = [
  {
    id: "brief",
    label: "Brief before manoeuvre",
    command: "Tom, prepare the main halyard and confirm ready.",
  },
  {
    id: "helm",
    label: "Steer head to wind",
    command: "Maya, hold heading into the wind.",
  },
  {
    id: "report",
    label: "Traffic report",
    command: "Elena, report any traffic on the starboard bow.",
  },
  {
    id: "abort",
    label: "Abort manoeuvre",
    command: "Abort the manoeuvre and secure the lines.",
  },
];

const iterations = DEFAULT_ITERATIONS;

function runCase({ id, label, command }) {
  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    const scenario = cloneScenario(raiseMainsailScenario);
    applyCommand(scenario, command);
    const elapsedMs = performance.now() - start;
    samples.push(elapsedMs);
  }

  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95 = samples.slice().sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];
  const max = Math.max(...samples);

  return {
    id,
    label,
    command,
    iterations,
    avgMs: Number(avg.toFixed(3)),
    p95Ms: Number(p95.toFixed(3)),
    maxMs: Number(max.toFixed(3)),
  };
}

function main() {
  const results = commandCases.map(runCase);
  const overallAvg = results.reduce((sum, entry) => sum + entry.avgMs, 0) / results.length;
  const overallMax = Math.max(...results.map((entry) => entry.maxMs));

  console.log("Live command benchmark");
  console.log("=".repeat(80));
  console.log(`Iterations per case: ${iterations}`);
  console.log(`Overall average latency: ${overallAvg.toFixed(3)} ms`);
  console.log(`Overall max latency: ${overallMax.toFixed(3)} ms`);
  console.log("");

  for (const entry of results) {
    console.log(
      `${entry.id.padEnd(12)} ${entry.label.padEnd(28)} avg=${entry.avgMs.toFixed(3)}ms p95=${entry.p95Ms.toFixed(3)}ms max=${entry.maxMs.toFixed(3)}ms`
    );
  }

  console.log("\nJSON summary");
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const underOneSecond = results.every((entry) => entry.avgMs < 1000 && entry.p95Ms < 1000);
  if (!underOneSecond) {
    process.exitCode = 1;
  }
}

main();
