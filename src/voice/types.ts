export type VoiceCapability = {
  available: boolean;
  mode: "browser-web-speech" | "macos-helper" | "unavailable";
  note: string;
};

export type TranscriptHandler = (transcript: string) => void;
