# Skippie Seamanship & Yacht Crew Simulator ⛵

Skippie is an interactive, browser-based, high-fidelity seamanship and yacht crew simulator focusing on decision-making, procedural compliance, and crew resource management (CRM) rather than high-fidelity racing arcade controls.

Built entirely using React, TypeScript, and Vite, it functions 100% locally and offline in the browser without any backend dependencies.

---

## 🌟 The Vision & Design Goals

As expressed in our foundational [Original Brief](docs/original-brief.md), Skippie is designed to bridge the gap between competent crew and skipper:
* **Crew Resource Management (CRM):** Teaches you to delegate effectively, communicate in clear standard nautical terms, and maintain situational awareness under high-workload maneuvers.
* **Realistic Seamanship over High Graphics:** Focuses on standard nautical rules, environmental interactions, and briefing/debriefing habits.
* **Deterministic Core & Local AI Layer:** Boat mechanics, wind-sail trim vectors, ground motion, and rigging geometries are fully deterministic and written in pure TypeScript. Dialogue generation, crew personality, and AI coaching are driven by swappable offline LLMs (e.g., Apple Silicon MLX, Ollama, LM Studio) to protect user data and ensure latency targets.

---

## 🛠️ What is Available Today (Current MVP Features)

Skippie currently supports a robust, visually immersive, and highly responsive training suite:

### 1. High-Fidelity Pedestal Cockpit View
* **First-Person Lookout perspective:** Experience sailing standing directly behind the steering wheel console looking forward.
* **Interactive look-around:** Swing your head up to $+/- 120^\circ$ to port/starboard in real-time. The tapered silver mast, boom rigging, winches, and forestay displace dynamically in coordinate perspective, while the steering pedestal dashboard stays locked in front of you.
* **Keyboard Accessibility:** Use the **`Left / Right Arrow`** keys to pivot your looking angle snappily in $10^\circ$ increments for rapid environment scanning.

### 2. Physical Apparent Horizon Tilting
* When heeling under wind force, the entire background world (clouds, island peaks, sea backdrop, channel buoys, background vessels) **tilts in real-time relative to your eye**!
* In absolute agreement with 3D camera geometry, the apparent tilt scales with the **cosine of your look angle** (looking straight ahead has full tilt, looking directly out the beam is perfectly level!).

### 3. Virtual SK36+ Marine Cockpit Instruments
* Programs virtual **Tridata** (Speed-Through-Water, Depth, Trip Log) and **Analog Wind** (direction pointers, digital apparent speed) panels.
* Features custom italicized, slanted SVG 7-segment digits showing faint background unlit segments and synchronized **orange night backlighting**.

### 4. Dynamic Yacht Seascape & Visual Signals
* Renders **Region A IALA Port (Red Can) / Starboard (Green Cone) lateral buoys** and crossing **Cargo Vessels** carrying container stacks and port red lights.
* Renders **dynamic background yachts** in 5 realistic seamanship states: Sailing, Motor-sailing, Motoring, Anchored, and Heaving-To.
* background boats face realistic headings (anchored bows face directly into the wind at $358^\circ$, sailing boats maintain a close-hauled point of sail) and display **daytime visual signal marks** (motoring cones pointing down and anchoring spheres on their forestay), named generically to easily bind to evening lights in the next phase!

### 5. Hands-Free Autopilot Tacking Demo
* Runs a cinematic **4.4-second automated tacking maneuver** on a standard **Beneteau First 36.7 polar VPP model**:
  * Starts close-hauled on a Starboard tack (heading $315^\circ$), heels portward, sails sheeted port.
  * Autopilot commands `"Helm, turn starboard to tack"`, wheel rotates clockwise, bow crosses North ($358^\circ$ irons) where speed drops and sails luff.
  * Settle close-hauled on Port tack (heading $045^\circ$), sheets are winched to starboard, yacht heels starboard, and **Local AI Yacht Coach** generates structured performance reviews.

### 6. Dynamic Genoa Telltales (Wool Indicators)
* Telltales are rendered on the Genoa forestay luff foil (colored red/green appropriate for the tack side).
* They fly **perfectly horizontal** when sails are sheeted and trimmed, and **droop vertically loose down** and flutter when sails luff in irons, giving direct visual feedback of wind laminar flow.

### 7. Core Testing Infrastructure
* Fully guarded by **18 Vitest unit-test assertions** covering degrees normalization, visual projection boundaries, backed Genoa heave-to tacks, apparent horizon cosine scaling, and background vessel windward points of sail.

---

## 🚀 Execution & Developer Instructions

### A. System Setup
Ensure you have Node.js installed in your workspace.

```bash
# Install dependencies (Vite, React, Vitest)
npm install
```

### B. Commands
* **Run local development server:**

  ```bash
  npm run dev:app
  ```

  Opens the interactive simulator at `http://localhost:5173`.
* **Execute all unit-tests concurrently (Vitest):**

  ```bash
  npm run test
  ```
  
  Runs both `src/sim/physics.test.ts` (VPP polars) and `src/sim/projection.test.ts` (Visual look-around/coordinate offsets) inside Vitest.
* **Dry-run compile checks:**

  ```bash
  npx tsc --noEmit
  ```
  
* **Build production package:**

  ```bash
  npm run build
  ```
