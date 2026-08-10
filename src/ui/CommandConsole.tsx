import { FormEvent, KeyboardEvent, useState } from "react";
import type { VoiceCapability } from "../voice/types";

type Props = {
  disabled: boolean;
  voiceEnabled: boolean;
  voiceCapability: VoiceCapability;
  onCommand(command: string): void;
  onToggleVoice(): void;
  onListen(): void;
};

const quickCommands = [
  "Brief crew for raising the mainsail",
  "Helm, keep us head to wind",
  "Mast, prepare the mainsail",
  "Bow lookout, report traffic",
  "Hoist the mainsail now",
  "Abort",
];

export function CommandConsole({ disabled, voiceEnabled, voiceCapability, onCommand, onToggleVoice, onListen }: Props) {
  const [draft, setDraft] = useState("");

  function sendDraft() {
    if (!draft.trim()) return;
    onCommand(draft);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    sendDraft();
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.metaKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendDraft();
    }
  }

  return (
    <section className="command-console" aria-label="Skipper command console">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Skipper input</p>
          <h2>Command the crew</h2>
        </div>
        <button className={voiceEnabled ? "icon-button active" : "icon-button"} type="button" onClick={onToggleVoice} title={voiceCapability.note}>
          {voiceEnabled ? "Mic on" : "Mic"}
        </button>
      </div>
      <form onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Example: Helm, keep us head to wind."
          disabled={disabled}
        />
        <div className="console-actions">
          <button type="button" onClick={onListen} disabled={!voiceEnabled || !voiceCapability.available || disabled}>
            Listen
          </button>
          <button type="submit" disabled={disabled || draft.trim().length === 0} title="⌘+Enter on macOS; Windows key+Enter on Windows">
            Send <span aria-hidden="true">⌘↵</span>
          </button>
        </div>
      </form>
      <div className="quick-command-grid">
        {quickCommands.map((command) => (
          <button type="button" key={command} onClick={() => onCommand(command)} disabled={disabled}>
            {command}
          </button>
        ))}
      </div>
      <p className="voice-note">{voiceCapability.note}</p>
    </section>
  );
}
