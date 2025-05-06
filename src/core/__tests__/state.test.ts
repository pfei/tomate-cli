import { describe, it, beforeEach, expect, vi } from "vitest";
import { createState } from "../state.js";

// Mock config and metrics paths
const mockConfigPath = "/tmp/test-config.json";
const mockMetricsPath = "/tmp/test-metrics.json";

// Mock config object
const mockConfig = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  sound: { pomodoroEnd: "path/to/pomodoro.mp3", breakEnd: "path/to/break.mp3" },
};

// Mock loadConfig and recordSession
vi.mock("../../utils/config.js", () => ({
  loadConfig: vi.fn(() => mockConfig),
}));
vi.mock("../../utils/metrics.js", () => ({
  recordSession: vi.fn(),
}));

describe("state module", () => {
  let state: ReturnType<typeof createState>;
  let getState: typeof state.getState;
  let updateState: typeof state.updateState;
  let resetState: typeof state.resetState;
  let advanceCycle: typeof state.advanceCycle;

  beforeEach(() => {
    vi.clearAllMocks();
    state = createState(mockConfigPath, mockMetricsPath);
    getState = state.getState;
    updateState = state.updateState;
    resetState = state.resetState;
    advanceCycle = state.advanceCycle;
    resetState(); // Always start from initial state
  });

  describe("getState()", () => {
    it("returns the current state", () => {
      const s = getState();
      expect(s).toBeDefined();
      expect(s.config).toEqual(mockConfig);
    });
  });

  describe("updateState()", () => {
    it("updates a single property", () => {
      const initialState = getState();
      updateState({ isPaused: true });
      const updatedState = getState();
      expect(updatedState.isPaused).toBe(true);
      expect(updatedState.currentMode).toBe(initialState.currentMode);
    });

    it("updates multiple properties", () => {
      const initialState = getState();
      updateState({
        isPaused: true,
        currentMode: "shortBreak",
        currentCycle: 2,
        secondsLeft: 123,
      });
      const updatedState = getState();
      expect(updatedState.isPaused).toBe(true);
      expect(updatedState.currentMode).toBe("shortBreak");
      expect(updatedState.currentCycle).toBe(2);
      expect(updatedState.secondsLeft).toBe(123);
      expect(updatedState.inConfigMenu).toBe(initialState.inConfigMenu);
    });
  });

  describe("resetState()", () => {
    it("resets the state to initial values based on config", () => {
      updateState({
        currentMode: "shortBreak",
        currentCycle: 3,
        secondsLeft: 10,
        isPaused: true,
      });

      resetState();
      const resetStateValue = getState();
      expect(resetStateValue.currentMode).toBe("pomodoro");
      expect(resetStateValue.currentCycle).toBe(0);
      expect(resetStateValue.secondsLeft).toBe(mockConfig.pomodoro);
    });
  });

  describe("advanceCycle()", () => {
    it("advances to shortBreak after pomodoro", () => {
      resetState();
      advanceCycle();
      const s = getState();
      expect(s.currentMode).toBe("shortBreak");
      expect(s.secondsLeft).toBe(mockConfig.shortBreak);
      expect(s.currentCycle).toBe(1);
    });

    it("advances to pomodoro after shortBreak", () => {
      resetState(); // Start fresh
      advanceCycle(); // pomodoro -> shortBreak (cycle = 1)
      updateState({ currentMode: "shortBreak" });
      advanceCycle(); // shortBreak -> pomodoro (cycle should remain 1)
      const s = getState();
      expect(s.currentMode).toBe("pomodoro");
      expect(s.secondsLeft).toBe(mockConfig.pomodoro);
      expect(s.currentCycle).toBe(1);
    });

    it("advances to longBreak after 4 pomodoro cycles", () => {
      updateState({ currentCycle: 3, currentMode: "pomodoro" });
      advanceCycle();
      const s = getState();
      expect(s.currentMode).toBe("longBreak");
      expect(s.secondsLeft).toBe(mockConfig.longBreak);
      expect(s.currentCycle).toBe(4);
    });
  });
});
