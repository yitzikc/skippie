# Local AI Notes

Skippie treats the LLM as an optional local sidecar. The deterministic TypeScript simulator owns movement, scoring, crew state, and replay data. The model receives structured summaries and produces dialogue or debrief text only.

## MLX Server

Install MLX LM in a Python environment, then run an OpenAI-compatible local server:

```bash
pip install mlx-lm
mlx_lm.server --model mlx-community/Qwen3-8B-4bit
```

With the project venv in `./.venv`, the easiest day-to-day command is:

```bash
npm run dev:local
```

That command checks whether an MLX server is already running at `http://localhost:8080`, starts one if needed, and then launches Vite. To start only the LLM sidecar:

```bash
npm run dev:llm
```

You can override the model or app port:

```bash
SKIPPIE_MLX_MODEL=mlx-community/Qwen3-4B-4bit npm run dev:local
SKIPPIE_VITE_PORT=5174 npm run dev:local
```

The app expects the server at:

```text
http://localhost:8080/v1/chat/completions
```

The default adapter lives in `src/ai/localLlm.ts`. It is deliberately small so Ollama or LM Studio can be added without touching simulation code.

## Caching

Yes. MLX LM downloads Hugging Face models once and reuses the local cache on later runs. In a typical macOS setup this goes through the Hugging Face cache under:

```text
~/.cache/huggingface/hub
```

The first run of a model can take a while because it downloads the weights. Later runs should start from the cached copy unless the cache is cleared, the model revision changes, or you choose a different model.

## Model Sizing

For an Apple Silicon Mac with 16 GB RAM:

- Use a 4-bit 4B model for fastest iteration.
- Use a 4-bit 8B instruct model when better coaching and crew dialogue matter.
- Keep the UI usable when the model is offline.

## Voice Spike

The browser currently probes for Web Speech API support in `src/voice/browserSpeech.ts`. That is useful for a quick command-input experiment but should not be treated as the final offline solution.

The practical local macOS path is a small helper app or Tauri shell that uses `SFSpeechRecognizer`, checks on-device recognition availability, and sends transcripts into the same command parser used by text input.
