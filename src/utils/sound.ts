import { spawn } from "node:child_process";
import { TimerState } from "../core/state.js";

export function playSound(soundType: "pomodoro" | "break", getState: () => TimerState): void {
  const hasDisplay = !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (!hasDisplay) return;

  const { config } = getState();
  const soundPath = soundType === "pomodoro" ? config.sound.pomodoroEnd : config.sound.breakEnd;

  const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", soundPath], {
    detached: true,
    stdio: "ignore",
  });

  ffplayProcess
    .on("error", () => { })   // silently ignore if ffplay not installed
    .on("exit", () => { })
    .unref();
}
