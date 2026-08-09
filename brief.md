# Project Brief: AI-Powered Sailing Crew & Seamanship Simulator

## Vision

Build a browser-based sailing training simulator that teaches **decision-making, crew coordination and practical seamanship**, rather than high-fidelity sailing physics.

The simulator should feel closer to a flight simulator's Crew Resource Management (CRM) training than to a racing game.

The primary audience is recreational sailors progressing from competent crew to skipper.

The goal is to allow repeated practice of high-pressure manoeuvres that are difficult, expensive or unsafe to rehearse repeatedly on a real yacht.

---

# Educational Objectives

The simulator should train users to:

* Maintain situational awareness.
* Delegate effectively rather than attempting to perform every task themselves.
* Use clear and standard nautical terminology.
* Recognise workload saturation.
* Make conservative decisions.
* Abort manoeuvres before situations become unrecoverable.
* Build good habits for briefing and debriefing.
* Develop mental models of how wind, tide and inertia affect a yacht.

The simulator should explicitly reward good seamanship rather than "winning".

---

# Core Philosophy

The project is **not** attempting to simulate sailing physics with high precision.

Instead it simulates:

* people
* procedures
* communication
* decision making
* environmental uncertainty

The simulation should intentionally prioritise realism of operations over realism of graphics.

---

# MVP

The first version should run entirely locally in a browser.

No backend.

No online services.

No user accounts.

Single-player.

One yacht.

AI controls the crew.

---

# Target Platform

Primary platform:

* Apple Silicon Macs
* Safari and Chromium browsers

Future:

* iPad
* Vision Pro / VR
* Multiplayer

---

# Technology Stack

Frontend

* React
* TypeScript
* Vite

State management

* XState (preferred) or Zustand

Rendering

Phase 1

* SVG or Canvas
* Cockpit-first 2.5D views using simplified, readable scene composition
* Top-down 2D view for tactical awareness, replay and debrief

Phase 2

* Three.js

Phase 3

* VR support

Simulation

Pure TypeScript.

No dependency on the LLM.

The simulation must be deterministic.

---

# Core Player Experience

The default experience should put the user in the role of skipper in the cockpit.

The simulator should feel like operating from a real helm position rather than commanding a diagram.

The main active-play view should be a first-person cockpit view looking forward.

The interface should support three primary camera modes:

* Cockpit forward view — default active-play view, looking ahead over the coachroof, mast and foredeck.
* Cockpit aft view — optional active-play view, looking back toward the stern, wake, engine controls and crew in the cockpit.
* Top-down view — tactical/replay view, used when needed during play and especially during debriefs for right-of-way, docking, anchoring and near-miss analysis.

Switching between the three views should be quick and obvious.

The user should not need to navigate menus to change view during a high-workload manoeuvre.

View switching should preserve scenario state and should not pause the simulation unless the user explicitly pauses.

---

# Cockpit Instrumentation

The cockpit view should expose the information a skipper would naturally scan.

Required cockpit controls and instruments:

* Engine power lever.
* Wind direction dial.
* Wind speed dial.
* Digital depth display.
* Digital speed-over-water display.
* Port and starboard winches.
* Rope-to-winch indication.

The engine power lever should support:

* Reverse 1.
* Neutral.
* Forward 1.
* Forward 2.
* Forward 3.

The lever should be visually legible at a glance and should map directly to deterministic boat state.

Wind instruments should help the user build a mental model rather than merely expose hidden variables.

Depth and speed-over-water should be shown as compact digital displays.

The display should distinguish speed through water from speed over ground if speed over ground is added later.

---

# Winches and Ropes

Winches are part of the seamanship training surface rather than decorative cockpit furniture.

Each winch should show which rope is currently loaded.

Ropes should have names and colour patterns, for example:

* Main halyard — solid red.
* Topping lift — brown and white stripes.
* Genoa sheet port — blue fleck.
* Genoa sheet starboard — green fleck.
* Reefing line 1 — black and white fleck.

Changing the rope on a winch should happen through crew communication, not direct manipulation by the user.

Example command:

"Tom, put the main halyard on the starboard winch."

The deterministic engine should validate whether the requested rope/winch assignment is possible and update the winch state.

The crew/LLM layer may acknowledge, query ambiguity or report a problem, but the deterministic state owns the truth.

Hovering over either winch should reveal a compact card listing available ropes and their colour patterns.

The hover card should be informational only.

It should not become a substitute for giving clear crew commands.

---

# Onboarding

The first launch should include quick onboarding that identifies the main cockpit elements and the user's immediate objective.

Onboarding should:

* Explain the three views.
* Identify engine lever, wind instruments, depth, speed and winches.
* Explain that rope changes happen through crew commands.
* Give one or two example skipper commands.
* Show the first scenario objective.

The onboarding should be dismissible immediately.

Dismissal should take the user straight into the scenario without blocking play.

The user should be able to reopen onboarding from the UI later.

Onboarding should avoid feeling like a tutorial wall.

It should be short, contextual and skippable.

---

# Simulation Architecture

The system consists of independent subsystems.

## Boat

State includes:

* position
* heading
* speed
* angular velocity
* momentum
* engine state
* engine power setting
* rudder angle
* bow thruster
* anchor state
* instrument readings
* winch state
* rope inventory

Physics should initially be simplified.

Engine power should be modelled as discrete settings initially:

* Reverse 1.
* Neutral.
* Forward 1.
* Forward 2.
* Forward 3.

The simplified physics model should translate engine setting into acceleration, stopping distance and prop-wash effects later.

---

## Environment

* wind direction
* wind strength
* gust model
* tidal current
* visibility
* harbour layout

The user is not necessarily told all values directly.

Environmental cues should reveal them.

---

## Crew

Each crew member has:

* current role
* current task
* experience
* fatigue
* attention
* confidence
* position on boat
* communication quality

Crew members may misunderstand instructions.

Crew members may proactively report observations.

Crew members should differ in personality.

---

## Ropes and Deck Gear

State includes:

* available ropes
* rope names
* rope colour patterns
* rope purpose
* current winch assignments
* whether a rope is free, loaded, under tension, jammed or unavailable

Rope and winch state should be deterministic.

Crew may make mistakes or ask for clarification, but successful rope changes are represented explicitly in world state.

---

## Nearby vessels

Each nearby vessel has:

* position
* movement
* skipper behaviour
* readiness to receive lines
* errors

---

# Role of the LLM

The LLM should **not** calculate boat movement.

It is responsible for:

* crew dialogue
* misunderstandings
* initiative
* personality
* debrief generation
* coaching
* natural language interaction

The deterministic engine owns all world state.

The LLM only receives a structured summary.

---

# Initial Scenarios

## Scenario 1

Raise the mainsail

Skills:

* crew assignment
* communication
* maintaining head to wind
* sequencing

---

## Scenario 2

Lower the mainsail

Skills:

* coordination
* timing
* sail handling

---

## Scenario 3

Mediterranean anchoring into a flotilla

Skills:

* rapid preparation
* assigning roles
* anchoring
* passing lines
* positioning
* abort decisions

---

## Scenario 4

Morning departure

Skills:

* sequencing
* safe release of lines
* anchor recovery
* avoiding fouled propellers

---

## Scenario 5

UK marina docking

Example:

Cowes
Yarmouth
Lymington

Skills:

* reading tidal flow
* interpreting visual cues
* compensating for current
* dealing with gusts
* aborting early

---

# Interaction Model

The user should primarily act as skipper.

They communicate using natural language or menu commands.

Voice interaction is a priority direction, but text command input remains the baseline control path.

Direct mouse/touch controls are appropriate for view switching, pausing, replay, onboarding and possibly the engine lever.

Crew tasking should primarily happen through language.

Examples:

"Prepare starboard stern line."

"Bow lookout, report distance."

"Bow thruster to port for two seconds."

"Tom, put the main halyard on the starboard winch."

"Maya, come astern one."

"Abort."

Crew members acknowledge instructions using closed-loop communication.

Ambiguous instructions should prompt clarification or cause realistic hesitation.

The system should reward clear role, action and timing in commands.

---

# Scoring

The simulator should score behaviours rather than simply outcomes.

Possible metrics:

* situational awareness
* workload distribution
* communication clarity
* command ambiguity
* crew idle time
* unsafe actions
* excessive skipper workload
* procedural compliance
* collision risk
* confidence of crew
* time pressure management

---

# Replay

Every scenario should support replay.

The replay should show:

* boat trajectory
* wind
* current
* command timeline
* crew actions
* critical decision points
* view changes
* instrument history
* rope/winch state changes

---

# AI Coach

After each exercise:

The AI should produce:

* what went well
* what nearly caused failure
* alternative strategies
* best-practice recommendations
* suggested exercises

The coach should explain *why*, not merely *what*.

---

# Local AI Requirements

The simulator must function offline.

Preferred interfaces:

* Ollama
* LM Studio
* MLX

The LLM interface should be abstract so different local models can be swapped without changing application logic.

---

# Candidate Local Models (Apple Silicon)

Primary recommendation:

* Qwen 3 Instruct (8B) — strong reasoning, instruction following and dialogue while remaining practical on a MacBook Air M3 with 16 GB RAM.

Alternatives:

* Gemma 3 (4B or 12B depending on available memory) — excellent conversational quality and structured outputs.
* Llama 3.1 8B Instruct — mature ecosystem and good tool use.
* Mistral Small (when available in a local-compatible quantisation) — good balance between reasoning and latency.
* Phi-4 Mini — lightweight option for fast iteration if memory or responsiveness becomes a constraint.

The application should support selecting the active model at runtime.

---

# Local AI Latency Benchmark

The project should include a repeatable local benchmark for the active LLM.

The benchmark should measure:

* time to first token
* total response time
* generated tokens per second
* input length in words and tokens
* output length in tokens
* warm-cache versus cold-start behaviour

The benchmark should cover representative skipper interactions:

* Short command: "Prepare the main halyard."
* Medium command: "Tom, put the main halyard on the starboard winch and confirm when ready."
* Situational query: "Bow lookout, report distance to the moored boat and whether we have room to turn."
* Debrief prompt using a structured scenario summary.

The benchmark should distinguish between:

* command intent parsing
* crew acknowledgement
* coaching/debrief generation

Near-real-time voice interaction should target a response that feels conversational.

Initial target:

* Crew acknowledgement: under 1.5 seconds after transcript finalisation.
* Longer coaching response: under 5 seconds for first useful output, with streaming if possible.

If the local 8B model cannot meet these targets, the app should support a smaller fast model for active play and reserve the larger model for debriefs.

---

# Future Extensions

* Voice interaction.
* Vision Pro support.
* Cooperative multiplayer.
* Instructor mode.
* Yacht-specific handling characteristics.
* RYA training scenarios.
* MOB drills.
* Engine failures.
* Night entries.
* Heavy-weather decision making.
* Charter handover practice.
* Race start procedures.

---

# Design Principles

* Fast iteration over visual fidelity.
* Educational value before entertainment.
* Deterministic simulation with AI-driven human behaviour.
* Extensible scenario framework.
* Modular architecture separating physics, world state, UI and AI.
* Every feature should support a defined learning objective.
