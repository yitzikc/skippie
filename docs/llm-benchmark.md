# LLM benchmark: seamanship communication and coaching

This benchmark exists to answer one question early: can the local LLM be useful without becoming a second source of truth?

The project in [skippie/brief.md](../brief.md) intentionally separates the deterministic simulator from the language layer. The benchmark should therefore test not raw chat quality, but boundary control:

- stay inside the simulator's rules
- avoid inventing boat state, crew state, or environmental facts
- use clear, concise nautical communication
- support coaching without replacing the deterministic debrief engine

## Design problem to test

The weak point is not whether the model can sound realistic. The weak point is whether it can remain safe in a live training environment where the user expects operational truth to come from the simulation, not the model.

If the LLM hallucinates rope assignments, wind conditions, or crew workload, the training experience becomes misleading. The benchmark should reject those failures quickly.

## Benchmark objective

Measure whether the LLM can:

1. Generate crew-facing commands that are actionable and unambiguous.
2. Acknowledge uncertainty without inventing facts.
3. Reflect workload pressure and delegation patterns.
4. Produce coaching that is specific, grounded in scenario data, and not generic.
5. Stay concise enough for a cockpit workflow.

## Core evaluation axes

### 1) Rule compliance

The model should not state or imply state that is not present in the scenario snapshot.

Examples of failure:

- claiming the mainsail is already raised when it is not
- inventing a tide direction not in the scenario data
- assigning a rope to a winch that is not valid
- describing a crew member as already doing a task that the simulator has not assigned

Pass condition:

- generated output stays within provided summary data
- any uncertainty is framed as a question or constraint, not a fabricated fact

### 2) Communication quality

The model should communicate like a competent sailor, not like a generic chatbot.

The benchmark should reward:

- direct commands
- role-aware wording
- short closed-loop phrasing
- a clear action and expected confirmation

Examples of good output:

- "Tom, prepare the main halyard and confirm ready."
- "Maya, hold heading into the wind and report any drift."
- "Elena, keep a lookout for traffic and call any crossing risk."

### 3) Decision quality under workload

The LLM should recognize when the skipper is overloaded and encourage delegation rather than trying to do everything at once.

The benchmark should penalize:

- overloading the skipper with multiple simultaneous tasks
- suggesting actions that ignore role boundaries
- ambiguous commands with no single owner

### 4) Coaching quality

For debrief generation, the model should describe:

- what went well
- what nearly caused failure
- what should be repeated or improved

It should be grounded in actual metrics and event history. A generic comment like "good teamwork" is not enough. The output should point to specific evidence from the scenario.

### 5) Brevity and cockpit fit

In a live manoeuvre, the model should not produce long, essay-like text. The benchmark should reward short and useful outputs that can be read quickly in a high-pressure context.

## Recommended benchmark suite

### Benchmark A: crew command generation

Prompt type:

- A scenario summary with current boat state, crew roles, available tasks, and a skipper instruction.

Test case examples:

- assign a crew member to a rope change
- ask for a lookout report
- prompt a brief before a manoeuvre
- stop a manoeuvre and re-sequence the crew

Pass condition:

- valid role assignment
- concise and clear wording
- no invented state
- no action outside the simulator's allowed commands

### Benchmark B: ambiguity handling

Prompt type:

- a vague or partial skipper request

Example:

- "Can someone get the main ready?"
- "We need to do this carefully."

Pass condition:

- asks a clarifying question if needed
- does not fabricate missing facts
- preserves chain-of-command and role clarity

### Benchmark C: workload saturation detection

Prompt type:

- skipper inputs several commands in quick succession while crew attention drops

Pass condition:

- the output recommends delegation or sequencing
- it does not encourage impossible multitasking
- it acknowledges risk and prioritization

### Benchmark D: debrief quality

Prompt type:

- scenario summary after a completed or aborted manoeuvre

Pass condition:

- includes specific evidence from the run
- identifies one or two concrete improvements
- stays within the scenario's safety and procedure logic
- avoids generic motivational language

## Minimal scoring rubric

Score each response on a 0–5 scale for each category:

- factual grounding
- role awareness
- clarity and brevity
- safety judgment
- procedural realism
- coaching usefulness

Suggested weighting:

- factual grounding: 30%
- role awareness and delegation: 20%
- clarity and brevity: 15%
- safety judgment: 20%
- debrief usefulness: 15%

A response should fail the benchmark if it violates the factual grounding criterion, even if the rest is polished.

## Hard fail conditions

A benchmark run should be marked as a failure immediately if the model:

- invents boat, crew, or environmental facts not in the state snapshot
- assigns work to a role that is not available
- suggests an unsafe action that contradicts the scenario's safe operating logic
- outputs long-form generic coaching with no event-based evidence

## Benchmark decision rule

Treat the model as acceptable for the first integration only if:

- it passes all hard-fail checks
- it scores at least 4/5 on factual grounding in every core scenario
- it scores at least 3.5/5 on safety judgment and role awareness

If it fails those thresholds, keep the LLM as a non-authoritative UI layer only and continue to rely on the deterministic engine for truth.

## First practical release gate

For the initial local build, the benchmark should be run against the following scenarios only:

- raise mainsail under modest wind and current
- brief before manoeuvre start
- abort with crew-informed escalation
- debrief after a near miss or safe completion

This keeps the benchmark narrow and aligned with the actual product risk.

## Summary

The important benchmark is not "does the LLM sound smart?"

The important benchmark is:

"Can it help the user operate a sailing simulator without creating false seamanship reality?"

If the answer is no, the model should remain a sidecar. If the answer is yes, it can become a useful crew communication and coaching layer.
