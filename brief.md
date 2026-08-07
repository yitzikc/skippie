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
* Top-down 2D

Phase 2

* Three.js

Phase 3

* VR support

Simulation

Pure TypeScript.

No dependency on the LLM.

The simulation must be deterministic.

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
* rudder angle
* bow thruster
* anchor state

Physics should initially be simplified.

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

Examples:

"Prepare starboard stern line."

"Bow lookout, report distance."

"Bow thruster to port for two seconds."

"Abort."

Crew members acknowledge instructions using closed-loop communication.

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
