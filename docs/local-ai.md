# Local AI Notes

Skippie treats the LLM as an optional local sidecar. The deterministic TypeScript simulator owns movement, scoring, crew state, and replay data. The model receives structured summaries and produces dialogue or debrief text only.

## MLX Server

Install MLX LM in a Python environment, then run an OpenAI-compatible local server:

```bash
pip install mlx-lm
mlx_lm.server --model mlx-community/Qwen3-8B-4bit
```

The app expects the server at:

```text
http://localhost:8080/v1/chat/completions
```

The default adapter lives in `src/ai/localLlm.ts`. It is deliberately small so Ollama or LM Studio can be added without touching simulation code.

## Model Sizing

For an Apple Silicon Mac with 16 GB RAM:

- Use a 4-bit 4B model for fastest iteration.
- Use a 4-bit 8B instruct model when better coaching and crew dialogue matter.
- Keep the UI usable when the model is offline.

## Voice Spike

The browser currently probes for Web Speech API support in `src/voice/browserSpeech.ts`. That is useful for a quick command-input experiment but should not be treated as the final offline solution.

The practical local macOS path is a small helper app or Tauri shell that uses `SFSpeechRecognizer`, checks on-device recognition availability, and sends transcripts into the same command parser used by text input.
