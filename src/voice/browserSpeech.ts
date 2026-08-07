import type { TranscriptHandler, VoiceCapability } from "./types";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function detectVoiceCapability(): VoiceCapability {
  const browserSpeech = window.SpeechRecognition ?? window.webkitSpeechRecognition;

  if (browserSpeech) {
    return {
      available: true,
      mode: "browser-web-speech",
      note: "Browser speech recognition is available for a quick command-input spike.",
    };
  }

  return {
    available: false,
    mode: "macos-helper",
    note:
      "Browser speech recognition is not exposed here. The next practical spike is a small macOS helper using SFSpeechRecognizer.",
  };
}

export function startBrowserDictation(onTranscript: TranscriptHandler) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) return undefined;

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-GB";
  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const transcript = last?.[0]?.transcript?.trim();
    if (transcript) onTranscript(transcript);
  };
  recognition.start();
  return () => recognition.stop();
}
