import { spawn } from "node:child_process";
import chalk from "chalk";
import { TimerState } from "../core/state.js";

export function playSound(soundType: "pomodoro" | "break", getState: () => TimerState): void {
  //   const config = getState().config;
  //   const soundPath = soundType === "pomodoro" ? config.sound.pomodoroEnd : config.sound.breakEnd;

  const { config } = getState(); // Destructure for clarity
  const soundPath = soundType === "pomodoro" ? config.sound.pomodoroEnd : config.sound.breakEnd;
  const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", soundPath], {
    detached: true,
    stdio: "ignore",
  });

  ffplayProcess
    .on("error", (err) => {
      console.error(chalk.red(`🎵 Error playing ${soundType} sound:`), err);
    })
    .on("exit", (code) => {
      if (code) {
        console.error(chalk.red(`⚠ ${soundType} sound stopped with code:`), code);
      }
    })
    .unref();
}
