import { loadConfig } from "../utils/config.js";
import { TimerState } from "../types.js";
import { recordSession } from "../utils/metrics.js";

export function createState(configPath: string, metricsPath: string) {
  let _state: TimerState | null = null;

  function getOrCreateState(): TimerState {
    if (!_state) {
      _state = {
        isPaused: false,
        inConfigMenu: false,
        currentMode: "pomodoro",
        currentCycle: 0,
        secondsLeft: 0,
        config: loadConfig(configPath),
      };
    }
    return _state;
  }

  function getState(): TimerState {
    return getOrCreateState();
  }

  function updateState(partial: Partial<TimerState>): void {
    _state = { ...getOrCreateState(), ...partial };
  }

  function resetState(): void {
    const config = getState().config;
    _state = {
      ...getOrCreateState(),
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: config.pomodoro,
    };
  }

  function advanceCycle(): void {
    const currentState = getOrCreateState();
    const newState = { ...currentState };
    const config = currentState.config;

    // Record the completed session
    const sessionType = currentState.currentMode;
    const sessionDuration = config[sessionType] * 1000;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - sessionDuration);
    recordSession(
      {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        type: sessionType,
      },
      metricsPath,
    );

    if (newState.currentMode === "pomodoro") {
      newState.currentCycle++;
      newState.currentMode = newState.currentCycle % 4 === 0 ? "longBreak" : "shortBreak";
    } else {
      newState.currentMode = "pomodoro";
    }

    newState.secondsLeft = config[newState.currentMode];
    _state = newState;
  }

  return {
    getState,
    updateState,
    resetState,
    advanceCycle,
  };
}
