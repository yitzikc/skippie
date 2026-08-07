import { assign, createMachine } from "xstate";

type ScenarioStatusContext = {
  startedAt?: number;
  completedAt?: number;
  replayCursor: number;
  voiceEnabled: boolean;
};

type ScenarioStatusEvent =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "COMPLETE" }
  | { type: "RESET" }
  | { type: "SET_REPLAY_CURSOR"; value: number }
  | { type: "TOGGLE_VOICE" };

export const scenarioMachine = createMachine({
  types: {} as {
    context: ScenarioStatusContext;
    events: ScenarioStatusEvent;
  },
  id: "scenario",
  initial: "briefing",
  context: {
    replayCursor: 0,
    voiceEnabled: false,
  },
  on: {
    SET_REPLAY_CURSOR: {
      actions: assign({
        replayCursor: ({ event }) => event.value,
      }),
    },
    TOGGLE_VOICE: {
      actions: assign({
        voiceEnabled: ({ context }) => !context.voiceEnabled,
      }),
    },
  },
  states: {
    briefing: {
      on: {
        START: {
          target: "running",
          actions: assign({ startedAt: () => Date.now(), completedAt: () => undefined }),
        },
      },
    },
    running: {
      on: {
        PAUSE: "paused",
        COMPLETE: {
          target: "debriefing",
          actions: assign({ completedAt: () => Date.now() }),
        },
        RESET: {
          target: "briefing",
          actions: assign({ startedAt: () => undefined, completedAt: () => undefined, replayCursor: () => 0 }),
        },
      },
    },
    paused: {
      on: {
        RESUME: "running",
        RESET: {
          target: "briefing",
          actions: assign({ startedAt: () => undefined, completedAt: () => undefined, replayCursor: () => 0 }),
        },
      },
    },
    debriefing: {
      on: {
        RESET: {
          target: "briefing",
          actions: assign({ startedAt: () => undefined, completedAt: () => undefined, replayCursor: () => 0 }),
        },
      },
    },
  },
});
