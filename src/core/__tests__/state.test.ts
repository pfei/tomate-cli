import { describe, it, beforeEach, expect, vi } from "vitest";
import { advanceCycle, getState, resetState, updateState } from "../state.js";
import { loadConfig } from "../../utils/config.js";

// Mock at the top, before any imports that might use it
const mockConfig = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  sound: { pomodoroEnd: "path/to/pomodoro.mp3", breakEnd: "path/to/break.mp3" },
};
vi.mock("../../utils/config.js", () => ({
  loadConfig: vi.fn(() => mockConfig),
}));
// vi.mock intercepts all future calls to loadConfig() from anywhere
// in the module and redirects them to your this implementation which returns mockConfig.

describe("getState()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the current state", () => {
    const state = getState();
    expect(state).toBeDefined();
  });
});

describe("updateState()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advances to shortBreak after pomodoro", () => {
    resetState();
    advanceCycle();
    let state = getState();
    expect(state.currentMode).toBe("shortBreak");
    expect(state.secondsLeft).toBe(mockConfig.shortBreak);
    expect(state.currentCycle).toBe(1);
  });

  it("advances to pomodoro after shortBreak", () => {
    updateState({ currentMode: "shortBreak" });
    advanceCycle();
    let state = getState();
    expect(state.currentMode).toBe("pomodoro");
    expect(state.secondsLeft).toBe(mockConfig.pomodoro);
    expect(state.currentCycle).toBe(1);
  });

  it("advances to longBreak after 4 pomodoro cycles", () => {
    updateState({ currentCycle: 3, currentMode: "pomodoro" });
    advanceCycle();
    let state = getState();
    expect(state.currentMode).toBe("longBreak");
    expect(state.secondsLeft).toBe(mockConfig.longBreak);
    expect(state.currentCycle).toBe(4);
  });
});
