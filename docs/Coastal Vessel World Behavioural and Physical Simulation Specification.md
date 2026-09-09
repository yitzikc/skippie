# Coastal Vessel World — Updated Behavioural and Physical Simulation Specification

## 1. Purpose

The simulation represents a simplified coastal marine environment populated by autonomous small craft. Each vessel behaves purposefully, attempts to follow a desired course, respects the physical and navigational constraints of its vessel type, and applies a simplified subset of the **COLREGs (International Regulations for Preventing Collisions at Sea)**.

The initial implementation contains two vessel classes:

1. Sailing yachts
2. Motor boats

The simulation is intended to provide a physically plausible but computationally simple world in which vessel behaviour can later be extended with additional vessel types, more realistic hydrodynamics, navigation objectives, and potentially AI-controlled agents.

The model should favour **stable, plausible behaviour** over physical fidelity. It is not intended to be a navigation simulator or a safety-critical collision-prediction system.

---

# 2. World model

## 2.1 Coordinate system

The world is a two-dimensional Cartesian plane.

- Distance unit: nautical miles (NM)
- Time unit: hours, although simulation may use smaller integration steps
- Speed unit: knots (kn) = NM/hour
- Angles: degrees
- Headings: degrees clockwise from true north, 0–360°

Each vessel has:

- position `(x, y)`
- heading
- speed through water (SoW)
- velocity through water
- course over ground (COG)
- speed over ground (SOG)
- desired course
- vessel-specific constraints

---

# 3. Environmental fields

The world contains two uniform vector fields.

## 3.1 True wind

A constant true-wind vector:

- wind direction
- wind speed

The wind is uniform throughout the world.

## 3.2 Sea current

A constant current vector:

- current direction
- current speed

The current is uniform throughout the world.

For a vessel with velocity through water `V_water`:

`V_ground = V_water + V_current`

Thus:

- SoW and heading/course through water describe movement relative to the water;
- SOG and COG describe movement relative to the seabed/world.

---

# 4. Wind and apparent wind

For vessels capable of sailing, the relevant wind for determining sailing capability is **apparent wind**, not true wind.

The apparent wind velocity is calculated in the vessel's frame of reference from:

`V_apparent_wind = V_true_wind - V_vessel_through_water`

The resulting vector provides:

- apparent wind speed (AWS);
- apparent wind angle (AWA).

AWA is measured relative to the vessel's bow.

Use a signed AWA convention:

- negative = apparent wind from port;
- positive = apparent wind from starboard;
- 0° = directly ahead;
- ±180° = directly astern.

The current does **not** directly affect apparent wind because both the vessel and the surrounding water are being advected by the same current.

---

# 5. Coastline and shallow water

The world may contain a coastline.

The coastline separates:

- **deep water**, navigable by all currently modelled vessels;
- **shallow water**, adjacent to the coastline.

The coastline is not necessarily a closed boundary. The world may therefore represent an open coastal region rather than an enclosed bay.

The shallow-water region is a geometric property of the world and may initially be represented by a simple polygon or raster/grid mask.

## 5.1 Motor boats

Motor boats may enter shallow water but have reduced maximum speed.

A configurable shallow-water speed multiplier is used:

`shallowSpeed = deepWaterSpeed × shallowSpeedFactor`

## 5.2 Sailing yachts

Sailing yachts are initially assumed **not to enter shallow water while making way**.

When a sailing yacht approaches the shallow-water boundary, it must alter course sufficiently to remain in deep water.

Yachts at anchor or mooring may occupy shallow water.

### Simplification

The model does not initially calculate actual under-keel clearance, tide, bathymetry, squat, vessel draft, or grounding risk.

"Shallow water" is therefore a navigational exclusion zone rather than a hydrodynamic model.

---

# 6. Vessel activities

Initially every vessel operates in exactly one persistent activity.

Activities are:

```text
SAILING
MOTORING
AT_ANCHOR_OR_MOORING
```

The distinction between anchoring and mooring is deliberately not represented at this level.

From the perspective of another vessel, both are initially modelled as a vessel that is not making way and whose position is fixed.

Future versions may distinguish:

```text
AT_ANCHOR
AT_MOORING
TIED_TO_PONTOON
ADRIFT
```

or other stationary states.

This distinction is intentionally deferred.

The initial simulation does not model spontaneous transitions between activities.

---

# 7. At-anchor-or-mooring behaviour

A vessel in `AT_ANCHOR_OR_MOORING`:

- has zero or negligible SOG;
- remains at a fixed world position;
- does not actively navigate;
- does not initiate collision-avoidance manoeuvres;
- may constitute an obstacle for vessels making way.

For this initial simplified model, an at-anchor-or-mooring vessel's heading is aligned with the **true wind direction**.

Thus:

`heading = windDirection`

This is a behavioural/physical simplification representing a vessel lying to its anchor or mooring.

The vessel's heading should be updated if the uniform wind direction changes in a future version.

This assumption must not be generalized to all stationary vessels. In particular, a future `TIED_TO_PONTOON` state may have an externally specified orientation.

---

# 8. Motor boat model

## 8.1 Motoring motor boat

A motoring motor boat:

- can travel in any heading;
- attempts to maintain its desired course;
- has a nominal SoW;
- is constrained by shallow water through a reduced maximum speed;
- participates in COLREGs as a **power-driven vessel**.

A representative nominal speed for the initial model is:

**20 kn**

This is a configurable representative value, not a physical constant.

A reasonable initial parameter range is approximately:

`10–30 kn`

The model does not initially distinguish displacement, semi-planing and planing motor boats.

---

# 9. Sailing yacht model

A sailing yacht initially has:

- nominal SoW between 4 and 7 kn;
- sails raised;
- no motor assistance;
- a sailing envelope defined in terms of **apparent wind angle**.

The initial default may be:

`nominal SoW = 5.5 kn`

The relationship between wind speed and achievable boat speed is deliberately omitted.

Likewise, the model does not initially calculate:

- sail force;
- hydrodynamic resistance;
- heel;
- leeway;
- sail trim;
- polar diagrams;
- wind-dependent boat speed;
- tacking efficiency.

The yacht is therefore treated as a vessel capable of travelling at a prescribed nominal speed provided its heading is compatible with its apparent-wind sailing envelope.

---

# 10. Sailing envelope

The yacht's permitted sailing directions are defined relative to **apparent wind**.

For the initial model:

`50° ≤ |AWA| ≤ 140°`

or equivalently:

```text
AWA ∈ [-140°, -50°] ∪ [50°, 140°]
```

Therefore the yacht cannot initially sail:

- within 50° of the apparent wind from ahead;
- closer than 40° to directly downwind.

The two permitted regions correspond to the two tacks.

The limits are configurable vessel parameters:

```text
minUpwindAWA = 50°
maxDownwindAWA = 140°
```

These values are deliberately simplified approximations and should not be treated as universal characteristics of sailing yachts.

Future implementations may replace the simple angular envelope with a vessel-specific polar performance model.

---

# 11. Tack determination

Tack is determined from the direction of the **apparent wind relative to the yacht**.

- `AWA < 0°` → port tack
- `AWA > 0°` → starboard tack

provided the yacht is in a valid sailing state.

This definition should be used by the collision-avoidance system when applying sailing-vessel COLREGs.

---

# 12. Tack and gybe behaviour

A sailing yacht may change tack or gybe when required by:

1. collision avoidance;
2. avoidance of shallow water;
3. inability to maintain the desired course;
4. other future navigation constraints.

In the absence of such requirements:

> A sailing yacht must not initiate a tack or gybe more frequently than once per 60 seconds.

Tacks and gybes are assumed to be instantaneous.

No time is initially spent:

- turning through the wind;
- accelerating/decelerating;
- trimming sails;
- completing the manoeuvre.

This is an explicit simplification.

---

# 13. Desired course

Every active vessel has a **desired course**.

The desired course represents the direction the vessel would follow in the absence of constraints.

The vessel continuously attempts to minimise deviation from this course.

For example:

`desiredCourse = 090°`

means the vessel's preferred direction is due east.

A sailing yacht may be unable to maintain its desired course if that course would place the yacht outside its permitted apparent-wind sailing envelope.

---

# 14. Feasible course

For a motor boat, any heading is initially feasible, subject to environmental and collision constraints.

For a sailing yacht, a candidate heading is feasible only if the resulting apparent wind satisfies:

`minUpwindAWA ≤ |AWA| ≤ maxDownwindAWA`

where apparent wind is calculated from the yacht's velocity through the water.

Consequently, changing course can itself change the apparent wind angle and therefore whether the resulting course is feasible.

The course-selection system must evaluate the apparent wind resulting from each candidate heading rather than applying a fixed true-wind angular exclusion zone.

---

# 15. Course-selection hierarchy

The vessel's behavioural controller should evaluate constraints in the following conceptual order:

1. Immediate collision avoidance
2. Immediate grounding/shallow-water avoidance
3. COLREGs obligations
4. Vessel-specific physical/navigation constraints
5. Desired-course maintenance
6. Speed maintenance

The resulting commanded course should satisfy the highest-priority constraints while deviating as little as reasonably possible from the desired course.

---

# 16. Collision detection

Collision prediction is based on the relative motion of vessels.

For two vessels A and B:

`relativePosition = positionB - positionA`

`relativeVelocity = velocityB_ground - velocityA_ground`

A collision is possible if the predicted trajectories can bring the vessels within a configurable **collision safety radius**.

The simulation should use:

- **CPA** — Closest Point of Approach;
- **TCPA** — Time to Closest Point of Approach.

At minimum:

```text
TCPA > 0
CPA < collisionThreshold
```

indicates a predicted future collision.

The collision safety threshold should be configurable.

---

# 17. Collision prediction uncertainty

Vessels do not have perfect knowledge of vessel motion.

For collision prediction, the observing vessel constructs an uncertainty envelope.

## 17.1 Own vessel

The observing vessel assumes uncertainty of:

- SoW: ±5%
- course: ±5°

## 17.2 Other vessel

The observing vessel assumes uncertainty of:

- SoW: ±20%
- course: ±10°

A collision risk exists if there is a plausible combination of velocities within these uncertainty ranges that results in a collision within the prediction horizon.

The first implementation may approximate this through sampling.

For example:

```text
own speed:   0.95S ... 1.05S
own course:  C-5° ... C+5°

other speed: 0.80S ... 1.20S
other course: C-10° ... C+10°
```

---

# 18. Collision prediction horizon

The initial prediction horizon is:

**5 minutes**

This is appropriate for the intended scale of the simulation, which concerns small craft operating in coastal waters.

The horizon should nevertheless remain a configurable simulation parameter.

The collision system should consider both:

- predicted minimum separation;
- time until predicted minimum separation.

A vessel should not react to encounters whose predicted consequences lie beyond the configured horizon.

---

# 19. COLREGs behavioural model

The collision-avoidance system implements a simplified subset of the COLREGs, especially rules concerning:

- lookout;
- safe speed;
- risk of collision;
- action to avoid collision;
- sailing vessels;
- overtaking;
- head-on situations;
- crossing situations.

The model distinguishes between:

```text
POWER_DRIVEN
SAILING
```

vessels.

`AT_ANCHOR_OR_MOORING` vessels are treated as obstacles rather than active participants in manoeuvring decisions.

---

# 20. Encounter classification

For two vessels capable of making way, the observing vessel classifies an encounter approximately as:

```text
NO_RISK
OVERTAKING
HEAD_ON
CROSSING
UNCERTAIN
```

Classification is based primarily on relative bearing and relative motion.

If the geometry does not permit sufficiently confident classification, the encounter should be treated conservatively.

---

# 21. Give-way responsibility

The following simplified COLREGs rules apply.

## 21.1 Power-driven versus sailing

Where a power-driven vessel encounters a sailing vessel:

> The power-driven vessel normally gives way to the sailing vessel.

The sailing vessel is normally the stand-on vessel.

The overtaking rule takes precedence where applicable.

## 21.2 Sailing vessel versus sailing vessel

When two sailing vessels encounter one another:

### Opposite tacks

A vessel on **port tack** gives way to a vessel on **starboard tack**.

### Same tack

The **windward** vessel gives way to the **leeward** vessel.

Tack is determined from each yacht's apparent wind.

## 21.3 Power-driven versus power-driven

### Head-on

Both vessels alter course to **starboard**, producing a port-to-port passing arrangement.

### Crossing

The vessel that has the other vessel on its **starboard side** gives way.

The stand-on vessel maintains course and speed unless action subsequently becomes necessary to avoid collision.

## 21.4 Overtaking

A vessel overtaking another vessel is responsible for keeping clear.

The overtaking rule takes precedence over the normal crossing/head-on classification.

---

# 22. Give-way manoeuvre selection

When:

```text
collisionRisk == true
AND
vessel == giveWayVessel
```

the vessel must select a new course.

The manoeuvre should:

1. eliminate the predicted collision;
2. remain within the vessel's physical/navigation constraints;
3. comply with the applicable COLREGs;
4. minimise deviation from the desired course;
5. avoid creating another collision risk;
6. preferably produce a clear passing distance.

For a sailing yacht, candidate manoeuvres include:

- alteration of course on the current tack;
- tack;
- gybe.

Every candidate sailing course must be evaluated using its resulting **apparent wind angle**.

---

# 23. Stand-on behaviour

If a vessel is the stand-on vessel and collision risk exists:

> It maintains course and speed.

A sailing vessel should not initiate a tack or gybe merely because another vessel is approaching while it is required to maintain course and speed.

It may nevertheless manoeuvre if necessary to avoid:

- shallow water;
- coastline;
- an imminent collision;
- another non-vessel obstacle.

---

# 24. Persistence of stand-on behaviour

A stand-on vessel should not continuously react to small changes in predicted trajectory.

It should maintain course and speed until:

1. collision risk is eliminated;
2. the other vessel has changed course or speed sufficiently;
3. continued maintenance of course becomes unsafe;
4. another navigational constraint requires action.

This prevents unstable reciprocal manoeuvring.

---

# 25. Collision-avoidance hysteresis

The collision-avoidance controller should contain hysteresis.

Once a vessel has entered a collision-avoidance manoeuvre, it should not immediately return to its desired course merely because the collision predictor momentarily reports a safe CPA.

A manoeuvre should be considered complete only when:

`risk has remained below the release threshold for a configurable period`

or when the encounter has clearly passed.

This is intended to prevent oscillatory manoeuvring.

---

# 26. Sailing-specific course selection

A sailing yacht cannot simply choose an arbitrary avoidance heading.

For every candidate heading:

1. calculate the resulting velocity through water;
2. calculate the resulting apparent wind;
3. calculate AWA;
4. reject the heading if AWA lies outside the sailing envelope;
5. determine the resulting tack;
6. evaluate collision and shallow-water consequences.

Candidate avoidance manoeuvres therefore consist of:

1. course alteration on the current tack;
2. tack;
3. gybe.

The controller should reject candidate manoeuvres that:

- enter shallow water;
- violate the sailing envelope;
- produce another predicted collision;
- violate the required COLREGs response.

---

# 27. Automaton states

Each vessel is represented as a **hybrid automaton**.

For an active vessel, useful behavioural states are:

```text
MAINTAINING_COURSE
AVOIDING_SHALLOW_WATER
GIVE_WAY_MANOEUVRE
STAND_ON
COLLISION_AVOIDANCE_EMERGENCY
AT_ANCHOR_OR_MOORING
```

For sailing yachts, tack is preferably represented as a property of the current sailing state rather than as an independent behavioural state:

```text
tack = PORT
tack = STARBOARD
```

Optional transient states may be retained:

```text
TACKING
GYBING
```

but since the manoeuvres are instantaneous they need not consume simulation time.

---

# 28. State transitions

Conceptually:

```text
MAINTAINING_COURSE
    │
    ├── shallow water predicted
    ▼
AVOIDING_SHALLOW_WATER
    │
    └── safe course found
            ▼
    MAINTAINING_COURSE


MAINTAINING_COURSE
    │
    ├── collision risk AND give-way
    ▼
GIVE_WAY_MANOEUVRE
    │
    └── encounter safely resolved
            ▼
    MAINTAINING_COURSE


MAINTAINING_COURSE
    │
    ├── collision risk AND stand-on
    ▼
STAND_ON
    │
    ├── risk resolved
    ▼
MAINTAINING_COURSE
```

`COLLISION_AVOIDANCE_EMERGENCY` is entered if a collision becomes imminent despite normal COLREGs behaviour.

`AT_ANCHOR_OR_MOORING` is a non-making-way state.

---

# 29. Behavioural decision cycle

At every simulation step, each vessel performs approximately:

1. Observe environment.
2. Determine current position and velocity.
3. Determine environmental constraints.
4. Detect nearby vessels.
5. Estimate their motion with uncertainty.
6. Determine whether collision risk exists.
7. Classify relevant encounters.
8. Determine give-way/stand-on responsibility.
9. Generate feasible candidate courses.
10. For sailing vessels, calculate apparent wind for each candidate.
11. Reject courses violating physical/navigation constraints.
12. Reject courses violating COLREGs requirements.
13. Select the course closest to desired course among remaining safe courses.
14. Update vessel state.
15. Integrate position and velocity.

The collision-avoidance system therefore constrains normal purposeful navigation rather than replacing it.

---

# 30. Formal automaton interpretation

Each vessel can be represented as a hybrid automaton:

`H = (Q, X, U, Inv, E, Guard, Reset, f)`

where:

- `Q` = discrete behavioural states;
- `X` = continuous vessel state;
- `U` = control inputs;
- `Inv` = state invariants;
- `E` = transitions;
- `Guard` = transition conditions;
- `Reset` = state changes associated with transitions;
- `f` = continuous state evolution.

Example continuous state:

```text
X = {
    x,
    y,
    heading,
    speedThroughWater,
    desiredCourse
}
```

For sailing yachts, derived variables include:

```text
trueWind
apparentWind
apparentWindSpeed
apparentWindAngle
tack
```

The complete simulation is therefore a **multi-agent hybrid dynamical system**, in which each vessel is an autonomous hybrid automaton coupled to the others through collision detection and shared environmental state.

---

# 31. Suggested initial defaults

| Parameter | Suggested initial value |
|---|---:|
| Yacht SoW | 5.5 kn |
| Motor boat SoW | 20 kn |
| Yacht minimum upwind AWA | 50° |
| Yacht maximum downwind AWA | 140° |
| Own SoW uncertainty | ±5% |
| Own course uncertainty | ±5° |
| Other SoW uncertainty | ±20% |
| Other course uncertainty | ±10° |
| Tack/gybe minimum interval | 60 s |
| Collision prediction horizon | 5 min |
| Shallow-water motor speed factor | configurable |
| Collision safety radius | configurable |

---

# 32. Explicit simplifying assumptions

The first implementation deliberately assumes:

1. The world is two-dimensional.
2. The world uses a flat Cartesian geometry.
3. Distances are measured in nautical miles.
4. Speeds are measured in knots.
5. True wind is spatially uniform.
6. Current is spatially uniform.
7. There are no waves.
8. There is no swell.
9. There is no tidal variation.
10. There is no wind gusting or shifting.
11. Current does not vary with location or depth.
12. Apparent wind is calculated from true wind and vessel velocity through water.
13. Current does not directly affect apparent wind.
14. There is no leeway model.
15. There is no heel model.
16. There is no sail-force model.
17. There is no hydrodynamic resistance model.
18. Yacht speed is independent of wind speed.
19. Motor power is not modelled.
20. Acceleration is initially neglected or simplified.
21. Tacks and gybes are instantaneous.
22. Tacks/gybes are limited to at most once per 60 seconds unless required for collision or obstacle avoidance.
23. Yachts cannot enter shallow water while making way.
24. Motor boats can enter shallow water but travel more slowly there.
25. `AT_ANCHOR_OR_MOORING` vessels remain at fixed position.
26. `AT_ANCHOR_OR_MOORING` vessels point into the true wind.
27. The model does not distinguish anchoring from mooring.
28. The model does not yet represent vessels tied to pontoons or other structures.
29. Vessels do not spontaneously change activity.
30. Vessels have perfect knowledge of the environmental wind/current fields.
31. Vessels have uncertain knowledge of their own and other vessels' velocity as specified above.
32. Vessel detection is assumed to be perfect within the modelled observation range.
33. Visibility, fog, darkness and sensor limitations are ignored.
34. COLREGs are represented by a simplified behavioural model rather than a complete legal implementation.
35. Vessel dimensions are initially represented by a configurable collision radius.
36. Wake effects are ignored.
37. Hydrodynamic interaction between vessels is ignored.
38. The collision prediction horizon is initially 5 minutes.
39. The model is not intended to be used for real-world navigation or safety decisions.

---

# 33. Recommended software architecture

The simulation should separate three layers.

### Layer 1 — World physics

Responsible for:

- position;
- velocity;
- true wind;
- current;
- apparent-wind calculation;
- coastline;
- shallow water;
- geometric intersection and distance calculations.

### Layer 2 — Vessel dynamics

Responsible for:

- vessel-specific speed;
- sailing envelope;
- apparent-wind constraints;
- heading constraints;
- turn rate;
- tack/gybe state;
- physical feasibility.

### Layer 3 — Vessel behaviour

Responsible for:

- desired course;
- encounter assessment;
- COLREGs;
- collision prediction;
- give-way/stand-on decisions;
- manoeuvre selection.

This separation is important because the behavioural model should be replaceable without rewriting the physical simulation.

---

# 34. Desired properties of the implementation

A successful first implementation should demonstrate that:

1. A lone motor boat follows its desired course.
2. A lone yacht follows its desired course when that course produces a valid apparent-wind angle.
3. A yacht automatically selects a different course when its desired course would place it outside its apparent-wind sailing envelope.
4. The yacht's feasible course changes appropriately when its speed or heading changes the apparent wind.
5. A yacht correctly identifies its tack from apparent wind.
6. A yacht avoids the coastline/shallow-water boundary.
7. A motor boat slows when entering shallow water.
8. Two power-driven vessels approaching head-on alter course to starboard.
9. Two power-driven vessels crossing correctly assign give-way responsibility.
10. A power-driven vessel gives way to a sailing vessel.
11. Two sailing vessels correctly apply tack-dependent rules.
12. Overtaking responsibility overrides the normal crossing classification.
13. A stand-on vessel does not oscillate in response to a give-way vessel.
14. A give-way vessel selects a feasible avoidance manoeuvre.
15. A sailing vessel does not select an impossible apparent-wind heading during collision avoidance.
16. Uncertainty can cause an encounter to be treated as dangerous even when nominal trajectories do not collide.
17. An at-anchor-or-mooring vessel remains fixed and points into the wind.
18. Once an encounter is safely resolved, vessels eventually return toward their desired courses.
19. The simulation remains stable and does not produce rapid oscillatory manoeuvres.

The last property is particularly important: **behavioural stability is a design requirement**, not merely a visual nicety.