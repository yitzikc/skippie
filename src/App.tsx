import { useEffect, useState } from "react";
import { useMachine } from "@xstate/react";
import { createLocalAiClient, defaultLocalModels } from "./ai/localLlm";
import { applyCommand, cloneScenario, tickScenario } from "./sim/engine";
import { raiseMainsailScenario } from "./sim/scenarios";
import type { ScenarioState } from "./sim/types";
import { scenarioMachine } from "./state/scenarioMachine";
import { CommandConsole } from "./ui/CommandConsole";
import { ScenarioCanvas } from "./ui/ScenarioCanvas";
import { ScoreBars } from "./ui/ScoreBars";
import { detectVoiceCapability, startBrowserDictation } from "./voice/browserSpeech";

const localAi = createLocalAiClient(defaultLocalModels[0]);

export function App() {
  const [machineState, send] = useMachine(scenarioMachine);
  const [scenario, setScenario] = useState<ScenarioState>(() => cloneScenario(raiseMainsailScenario));
  const [coachText, setCoachText] = useState("Complete the manoeuvre to generate a local debrief.");
  const [modelStatus, setModelStatus] = useState<"idle" | "checking" | "offline" | "online">("idle");
  const [voiceCapability] = useState(() => detectVoiceCapability());

  const isRunning = machineState.matches("running");
  const isDebriefing = machineState.matches("debriefing");

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setScenario((current) => {
        if (current.completed) return current;
        return tickScenario(current);
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (scenario.completed && isRunning) {
      send({ type: "COMPLETE" });
    }
  }, [isRunning, scenario.completed, send]);

  useEffect(() => {
    if (!isDebriefing) return;
    setModelStatus("checking");
    localAi.generateDebrief(scenario).then((result) => {
      setModelStatus(result.available ? "online" : "offline");
      setCoachText(result.text);
    });
  }, [isDebriefing, scenario]);

  function handleCommand(raw: string) {
    if (!isRunning) send({ type: "START" });
    setScenario((current) => applyCommand(current, raw));
  }

  function resetScenario() {
    setScenario(cloneScenario(raiseMainsailScenario));
    setCoachText("Complete the manoeuvre to generate a local debrief.");
    setModelStatus("idle");
    send({ type: "RESET" });
  }

  function listenForCommand() {
    startBrowserDictation(handleCommand);
  }

  const latestEvents = scenario.events.slice(-7).reverse();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Skippie local simulator</p>
          <h1>{scenario.title}</h1>
        </div>
        <div className="status-cluster">
          <span>{machineState.value.toString()}</span>
          <span>LLM {modelStatus}</span>
        </div>
      </header>

      <section className="mission-band">
        <p>{scenario.objective}</p>
        <div className="mission-actions">
          <button type="button" onClick={() => send({ type: isRunning ? "PAUSE" : "START" })} disabled={isDebriefing}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button type="button" onClick={resetScenario}>
            Reset
          </button>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="visual-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Top-down view</p>
              <h2>Harbour training area</h2>
            </div>
            <span>{Math.round(scenario.timeSec)}s</span>
          </div>
          <ScenarioCanvas scenario={scenario} />
          <div className="instrument-strip">
            <span>Heading {Math.round(scenario.boat.headingDeg)} deg</span>
            <span>Wind {scenario.environment.windStrengthKnots} kt</span>
            <span>Main {scenario.boat.mainsail}</span>
            <span>Current {scenario.environment.tidalCurrentKnots} kt</span>
          </div>
        </section>

        <CommandConsole
          disabled={isDebriefing}
          voiceEnabled={machineState.context.voiceEnabled}
          voiceCapability={voiceCapability}
          onCommand={handleCommand}
          onToggleVoice={() => send({ type: "TOGGLE_VOICE" })}
          onListen={listenForCommand}
        />

        <section className="crew-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Crew state</p>
              <h2>People, roles, workload</h2>
            </div>
          </div>
          <div className="crew-list">
            {scenario.crew.map((member) => (
              <article key={member.id} className="crew-card">
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <p>{member.task}</p>
                <meter min="0" max="1" value={member.attention} />
              </article>
            ))}
          </div>
        </section>

        <section className="score-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Behaviour score</p>
              <h2>Seamanship metrics</h2>
            </div>
          </div>
          <ScoreBars score={scenario.score} />
        </section>

        <section className="timeline-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Replay source</p>
              <h2>Command timeline</h2>
            </div>
          </div>
          <ol className="event-list">
            {latestEvents.map((event) => (
              <li key={event.id} className={`event-${event.kind}`}>
                <span>{event.timeSec}s</span>
                <p>{event.message}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="coach-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Local AI coach</p>
              <h2>Debrief</h2>
            </div>
          </div>
          <p>{coachText}</p>
        </section>
      </div>
    </main>
  );
}
