// src/types.ts
export interface TimerState {
  isPaused: boolean;
  inConfigMenu: boolean;
  currentMode: "pomodoro" | "shortBreak" | "longBreak";
  currentCycle: number;
  secondsLeft: number;
  config: Config;
}

export interface Config {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  sound: {
    pomodoroEnd: string;
    breakEnd: string;
  };
}
