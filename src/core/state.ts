import { loadConfig } from "../utils/config.js";

interface TimerState {
  isPaused: boolean;
  inConfigMenu: boolean;
  currentMode: "pomodoro" | "shortBreak" | "longBreak";
  currentCycle: number;
  secondsLeft: number;
}

let state: TimerState = {
  isPaused: false,
  inConfigMenu: false,
  currentMode: "pomodoro",
  currentCycle: 0,
  secondsLeft: 0,
};

export function getState(): TimerState {
  return state;
}

export function updateState(partial: Partial<TimerState>): void {
  state = { ...state, ...partial };
}

export function resetState(): void {
  state = {
    ...state,
    currentMode: "pomodoro",
    currentCycle: 0,
    secondsLeft: loadConfig().pomodoro,
  };
}
