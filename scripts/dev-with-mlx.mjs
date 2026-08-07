import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const llmOnly = process.argv.includes("--llm-only");
const model = process.env.SKIPPIE_MLX_MODEL ?? "mlx-community/Qwen3-8B-4bit";
const mlxHost = process.env.SKIPPIE_MLX_HOST;
const mlxPort = process.env.SKIPPIE_MLX_PORT;
const mlxBaseUrl = process.env.SKIPPIE_MLX_BASE_URL ?? `http://${mlxHost ?? "localhost"}:${mlxPort ?? "8080"}`;
const vitePort = process.env.SKIPPIE_VITE_PORT ?? "5173";

const children = new Set();

async function main() {
  const mlxAlreadyRunning = await isMlxRunning();

  if (mlxAlreadyRunning) {
    log("mlx", `Using existing local LLM server at ${mlxBaseUrl}`);
  } else {
    startMlx();
  }

  if (!llmOnly) {
    startVite();
  }
}

function startMlx() {
  const mlxBin = join(root, ".venv", "bin", "mlx_lm.server");
  if (!existsSync(mlxBin)) {
    fail(`Could not find ${mlxBin}. Create the venv and install mlx-lm first.`);
  }

  const args = ["--model", model];
  if (mlxHost) args.push("--host", mlxHost);
  if (mlxPort) args.push("--port", mlxPort);

  log("mlx", `Starting ${model}`);
  spawnWatched("mlx", mlxBin, args);
}

function startVite() {
  const viteBin = join(root, "node_modules", ".bin", "vite");
  if (!existsSync(viteBin)) {
    fail("Could not find Vite. Run `npm install` first.");
  }

  log("vite", `Starting app on http://localhost:${vitePort}/`);
  spawnWatched("vite", viteBin, ["--port", vitePort]);
}

function spawnWatched(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  child.stdout.on("data", (chunk) => prefix(label, chunk));
  child.stderr.on("data", (chunk) => prefix(label, chunk));
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (signal) {
      log(label, `Stopped by ${signal}`);
      return;
    }
    if (code && code !== 0) {
      log(label, `Exited with code ${code}`);
      shutdown(code);
    }
  });
}

async function isMlxRunning() {
  try {
    const response = await fetch(`${mlxBaseUrl}/v1/models`, {
      signal: AbortSignal.timeout(800),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function prefix(label, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line.trim()) log(label, line);
  }
}

function log(label, message) {
  console.log(`[${label}] ${message}`);
}

function fail(message) {
  console.error(`[skippie] ${message}`);
  process.exit(1);
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main();
