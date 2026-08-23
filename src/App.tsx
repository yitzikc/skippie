import { useEffect, useState } from "react";
import { useMachine } from "@xstate/react";
import { createLocalAiClient, defaultLocalModels } from "./ai/localLlm";
import { applyCommand, cloneScenario, tickScenario } from "./sim/engine";
import { raiseMainsailScenario, tackDemoScenario } from "./sim/scenarios";
import type { ScenarioState } from "./sim/types";
import { scenarioMachine } from "./state/scenarioMachine";
import { CommandConsole } from "./ui/CommandConsole";
import { ScoreBars } from "./ui/ScoreBars";
import { CockpitView } from "./ui/CockpitView";
import { detectVoiceCapability, startBrowserDictation } from "./voice/browserSpeech";

const localAi = createLocalAiClient(defaultLocalModels[0]);

export function App() {
  const [machineState, send] = useMachine(scenarioMachine);
  const [scenario, setScenario] = useState<ScenarioState>(() => cloneScenario(raiseMainsailScenario));
  const [coachText, setCoachText] = useState("Complete the manoeuvre to generate a local debrief.");
  const [modelStatus, setModelStatus] = useState<"idle" | "checking" | "offline" | "online">("idle");
  const [voiceCapability] = useState(() => detectVoiceCapability());
  const [isDemoActive, setIsDemoActive] = useState(false);

  const isRunning = machineState.matches("running");
  const isDebriefing = machineState.matches("debriefing");

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setScenario((current) => {
        if (current.completed) return current;

        if (isDemoActive) {
          // Autonomous high-fidelity choreographed tacking autopilot script!
          const next = cloneScenario(current);
          next.timeSec += 2.2;
          const t = next.timeSec;

          const addEvent = (kind: "command" | "crew" | "observation", msg: string) => {
            next.events.push({
              id: `demo-${t}-${Math.random()}`,
              timeSec: t,
              kind,
              message: msg,
            });
          };

          if (t >= 2.0 && t < 4.0) {
            addEvent("command", "Brief crew for tacking");
            addEvent("crew", "Maya (helm): Understood. Crew prepare for tacking maneuver.");
            next.score.proceduralCompliance = 90;
            next.score.workloadDistribution = 80;
          } else if (t >= 4.0 && t < 6.0) {
            addEvent("command", "Assign Maya to helm");
            addEvent("crew", "Maya: Helming station manned. Tom: sheets prepped. Elena: active lookout. All crew ready at positions!");
            next.score.workloadDistribution = 95;
          } else if (t >= 6.0 && t < 8.0) {
            addEvent("command", "Helm, turn port to tack");
            addEvent("crew", "Maya (helm): Turn port commenced! Helming hard over.");
            next.boat.rudderAngleDeg = -18;
            next.score.situationalAwareness = 90;
          } else if (t >= 8.5 && t < 10.5) {
            // PASSING HEAD TO WIND (IRONS) - 2.2 seconds into the turn!
            addEvent("observation", "Wind is dead ahead! Genoa and main luffing violently in irons.");
            addEvent("crew", "Elena (bow): Releasing port sheet! Sheet free!");
            next.boat.headingDeg = 12; // Head to wind
            next.boat.apparentWindAngleDeg = 0;
            next.boat.speedKnots = 2.8;
            next.boat.speedOverGroundKnots = 2.8;
            next.boat.heelDeg = 0.5;
            next.boat.leewayDeg = 1.0;
          } else if (t >= 10.5 && t < 13.0) {
            // COMPLETED ON NEW TACK - 4.4 seconds after starting the turn!
            addEvent("command", "Trim starboard sheet");
            addEvent("crew", "Tom (winch): Starboard sheet sheeted and trimmed! Sails drawing.");
            next.boat.rudderAngleDeg = 0; // Center helm
            next.boat.headingDeg = 315;
            next.boat.apparentWindAngleDeg = -32;
            next.boat.genoaTack = "starboard"; // Sheeted starboard!
            next.boat.speedKnots = 5.8;
            next.boat.speedOverGroundKnots = 5.8;
            next.boat.heelDeg = -13; // Settle heel on Port tack
            next.boat.leewayDeg = 3.5;
            next.score.proceduralCompliance = 98;
          } else if (t >= 13.0) {
            addEvent("observation", "Autopilot demo completed successfully! Settle close-hauled course 315°.");
            next.completed = true;
          }

          // Move the boat physically in the 2D arena
          const headingRad = (next.boat.headingDeg * Math.PI) / 180;
          next.boat.x += Math.sin(headingRad) * next.boat.speedKnots * 0.05 * 2.2;
          next.boat.y -= Math.cos(headingRad) * next.boat.speedKnots * 0.05 * 2.2;

          return next;
        }

        // Standard user-driven simulation tick
        return tickScenario(current);
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isRunning, isDemoActive]);

  useEffect(() => {
    if (scenario.completed && isRunning) {
      send({ type: "COMPLETE" });
    }
  }, [isRunning, scenario.completed, send]);

  useEffect(() => {
    if (!isDebriefing) return;
    if (scenario.id === "tack-demo") {
      setCoachText(
        "RYA Yacht Coach Debrief:\n\n" +
        "• Excellent Crew Coordination & CRM: Briefing the crew prior to the maneuver boosted workload preparedness.\n" +
        "• Accurate Command Sequence: Assigning Maya to helm manned the critical steering station before helm hard over was ordered.\n" +
        "• Perfect Genoa Trim & Sync: Port sheet was released exactly in irons, and the starboard sheet winched cleanly on the Port tack crossover. SOG loss was minimized.\n" +
        "• Settle Course: Rudder centered at 0° exactly on target heading 315° close-hauled, stabilizing the yacht's 13° heel with zero speed overshoots."
      );
      setModelStatus("online");
      return;
    }

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
    setIsDemoActive(false);
    setScenario(cloneScenario(raiseMainsailScenario));
    setCoachText("Complete the manoeuvre to generate a local debrief.");
    setModelStatus("idle");
    send({ type: "RESET" });
  }

  function toggleDemoMode() {
    if (isDemoActive) {
      setIsDemoActive(false);
      setScenario(cloneScenario(raiseMainsailScenario));
      setCoachText("Complete the manoeuvre to generate a local debrief.");
      setModelStatus("idle");
      send({ type: "RESET" });
    } else {
      setIsDemoActive(true);
      setScenario(cloneScenario(tackDemoScenario));
      setCoachText("Watching tack maneuver demonstration...");
      setModelStatus("idle");
      send({ type: "START" });
    }
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
          <button
            type="button"
            onClick={toggleDemoMode}
            disabled={isDebriefing}
            style={{
              background: isDemoActive ? "#b33d2b" : "#1d7a45",
              color: "white",
              fontWeight: 700,
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
            }}
          >
            {isDemoActive ? "Stop Demo" : "Autopilot Demo"}
          </button>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="visual-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cockpit view</p>
              <h2>Helm / forward lookout</h2>
            </div>
            <span>{Math.round(scenario.timeSec)}s</span>
          </div>
          <CockpitView scenario={scenario} />
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
                <span>{event.timeSec.toFixed(1)}s</span>
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
