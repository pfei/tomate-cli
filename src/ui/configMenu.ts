import readline from "readline";
import chalk from "chalk";
import boxen from "boxen";
import { loadConfig, saveConfig, NumericConfigKey } from "../utils/config.js";
import { formatTime } from "../utils/timeFormat.js";
import { displayCountdown } from "./displayCountdown.js";
import { TimerState } from "../core/state.js";

let currentRL: readline.Interface | null = null;

export function getCurrentRL(): readline.Interface | null {
  return currentRL;
}

export function cleanupConfigMenu(): void {
  if (currentRL) {
    currentRL.close();
    currentRL = null;
  }
}

export function showConfigMenu({
  configPath,
  getState,
  updateState,
}: {
  configPath: string;
  getState: () => TimerState;
  updateState: (partial: Partial<TimerState>) => void;
}): void {
  const wasPaused = getState().isPaused;
  updateState({ isPaused: true });
  updateState({ inConfigMenu: true });
  const config = loadConfig(configPath);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  currentRL = rl;

  process.stdout.write("\x1B[2J\x1B[0f");
  console.log(
    boxen(
      chalk.green("Configure Pomodoro Timers\n\n") +
        `Current Values:\n` +
        `🍅 Pomodoro:    ${chalk.cyan(formatTime(config.pomodoro))}\n` +
        `🌻 Short Break: ${chalk.cyan(formatTime(config.shortBreak))}\n` +
        `🌳 Long Break:  ${chalk.cyan(formatTime(config.longBreak))}\n\n` +
        "[1] Set Pomodoro\n" +
        "[2] Set Short Break\n" +
        "[3] Set Long Break\n" +
        "[q] Back to Timer",
      {
        padding: 1,
        borderColor: "green",
        borderStyle: "round",
      },
    ),
  );
  rl.question(chalk.cyan("Choose an option: "), (answer) => {
    const handleInput = (prompt: string, property: NumericConfigKey) => {
      rl.question(chalk.cyan(prompt), (value) => {
        const secs = parseInt(value, 10);
        if (!isNaN(secs) && secs > 0) {
          config[property] = secs;
          saveConfig(config, configPath);
          console.log(
            chalk.green(`✅ Updated ${property.replace(/([A-Z])/g, " $1").toLowerCase()}`),
          );
          if (property === "pomodoro") {
            updateState({ secondsLeft: secs });
          }
        } else {
          console.log(chalk.red("❌ Invalid duration (must be positive number)"));
        }
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(getState().secondsLeft, wasPaused, getState);
      });
    };

    const cleanupReadline = () => {
      rl.close();
      currentRL = null;
      updateState({ inConfigMenu: false });
      updateState({ isPaused: wasPaused });
      process.stdin.setRawMode(true);
      process.stdin.resume();
    };

    switch (answer) {
      case "1":
        handleInput("New Pomodoro (seconds): ", "pomodoro");
        break;
      case "2":
        handleInput("New Short Break (seconds): ", "shortBreak");
        break;
      case "3":
        handleInput("New Long Break (seconds): ", "longBreak");
        break;
      case "q":
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(getState().secondsLeft, wasPaused, getState);
        break;
      default:
        console.log(chalk.red("⚠ Invalid option"));
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(getState().secondsLeft, wasPaused, getState);
    }
  });
}
