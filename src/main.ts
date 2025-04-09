// src/main.ts
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import cliCursor from "cli-cursor";
import dotenv from "dotenv";
import readline from "readline";
import { loadConfig, saveConfig } from "./utils/config.js";
import { displayError } from "./utils/errors.js";
import { getState, updateState, resetState, advanceCycle } from "./core/state.js";

// Load environment variables
dotenv.config();

const audioPath = fileURLToPath(new URL("audio.mp3", new URL("./assets/", import.meta.url)));

if (!existsSync(audioPath)) {
  throw new Error(`Audio file not found: ${audioPath.replace(process.cwd(), ".")}`);
}

// State management
// let inConfigMenu = false;
// let isPaused = false;
// let secondsLeft = loadConfig().pomodoro;

let firstRender = true;
let currentRL: readline.Interface | null = null;
let countdownInterval: NodeJS.Timeout | null = null;

function playAudio(): void {
  const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", audioPath], {
    detached: true,
    stdio: "ignore",
  });

  ffplayProcess
    .on("error", (err) => console.error("🎵 Playback failed:", err))
    .on("exit", (code) => code && console.error("Playback stopped with code:", code))
    .unref();
}

function formatTime(secondsLeft: number): string {
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return [
    chalk.cyan(hours.toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(minutes.toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(seconds.toString().padStart(2, "0")),
  ].join("");
}

// function displayCountdown(secondsLeft: number, isPaused: boolean): void {
//   if (getState().inConfigMenu) return;

//   const modeDisplay = {
//     pomodoro: "🍅 Pomodoro",
//     shortBreak: "☕ Short Break",
//     longBreak: "🌴 Long Break",
//   }[getState().currentMode];

//   const timeString = formatTime(secondsLeft);
//   const pauseMessage = isPaused ? chalk.red("[PAUSED]") : "";

//   const boxedTime = boxen(
//     `${modeDisplay} ${timeString} ${pauseMessage}\n\n` + `[p]ause   [q]uit   [c]onfig`,
//     {
//       padding: 1,
//       borderColor: "cyan",
//       borderStyle: "round",
//       titleAlignment: "center",
//     },
//   );

//   if (firstRender) {
//     process.stdout.write(boxedTime + "\n");
//     firstRender = false;
//   } else {
//     // process.stdout.write("\x1B[7A\x1B[0J" + boxedTime + "\n");
//     process.stdout.write("\x1B[2J\x1B[3J\x1B[H" + boxedTime + "\n");
//   }
// }

function displayCountdown(secondsLeft: number, isPaused: boolean): void {
  if (getState().inConfigMenu) return;

  const modeDisplay = {
    pomodoro: "🍅 Pomodoro",
    shortBreak: "☕ Short Break",
    longBreak: "🌴 Long Break",
  }[getState().currentMode];

  const timeString = formatTime(secondsLeft);
  const pauseMessage = isPaused ? chalk.red("[PAUSED]") : "";

  const boxedTime = boxen(
    `${modeDisplay} ${timeString} ${pauseMessage}\n\n` + `[p]ause   [q]uit   [c]onfig`,
    {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "round",
      titleAlignment: "center",
      margin: { top: 1, bottom: 1 }, // Add vertical padding
    },
  );

  // Calculate box height
  const boxHeight = boxedTime.split("\n").length;

  // Clear and render logic
  if (firstRender) {
    process.stdout.write("\x1B[2J\x1B[H"); // Full clear
    process.stdout.write(boxedTime + "\n");
    firstRender = false;
  } else {
    const clearSequence =
      "\x1B[1G" + // Move to start of line
      "\x1B[1A\x1B[2K".repeat(boxHeight) + // Move up and clear lines
      "\x1B[H"; // Home cursor

    process.stdout.write(clearSequence + boxedTime + "\n");
  }
}

function showTimeUpPopup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "--center",
      "--sticky",
      "--on-top",
      "--button=(Return):0",
      "--button-layout=center",
      "--borders=20",
      "--text=Time's Up!",
      "--title=Tomate CLI",
    ];

    const env = {
      ...process.env,
      ...(process.env.GTK_THEME && { GTK_THEME: process.env.GTK_THEME }),
    };

    const yadProcess = spawn("yad", args, {
      env,
      stdio: "ignore",
      detached: true,
    });

    yadProcess.on("error", reject).on("exit", (code) => {
      code === 0 ? resolve() : reject(new Error(`Yad exited with code ${code}`));
    });
  });
}

function startCountdown(initialSeconds: number): void {
  stopCountdown(); // Clear existing interval
  getState().secondsLeft = initialSeconds;
  firstRender = true;

  countdownInterval = setInterval(() => {
    if (!getState().isPaused && !getState().inConfigMenu) {
      displayCountdown(getState().secondsLeft, getState().isPaused);
      updateState({ secondsLeft: getState().secondsLeft - 1 });

      if (getState().secondsLeft < 0) {
        stopCountdown();
        playAudio();
        console.log(chalk.green("\n🎉 Time's up!"));
        showTimeUpPopup()
          .then(() => {
            advanceCycle();
            startCountdown(getState().secondsLeft);
          })
          .catch((err) => {
            displayError("Popup failed", err);
            process.exit(1);
          });
      }
    }
  }, 1000);
}

function stopCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function showConfigMenu(): void {
  const wasPaused = getState().isPaused;
  updateState({ isPaused: true });
  updateState({ inConfigMenu: true });
  const config = loadConfig();
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
        `🍅 Pomodoro: ${chalk.cyan(formatTime(config.pomodoro))}\n` +
        `☕ Short Break: ${chalk.cyan(formatTime(config.shortBreak))}\n` +
        `🌴 Long Break: ${chalk.cyan(formatTime(config.longBreak))}\n\n` +
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
    const handleInput = (prompt: string, property: keyof typeof config) => {
      rl.question(chalk.cyan(prompt), (value) => {
        const secs = parseInt(value, 10);
        if (!isNaN(secs) && secs > 0) {
          config[property] = secs;
          saveConfig(config);
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
        displayCountdown(getState().secondsLeft, wasPaused);
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
        displayCountdown(getState().secondsLeft, wasPaused);
        break;
      default:
        console.log(chalk.red("⚠ Invalid option"));
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(getState().secondsLeft, wasPaused);
    }
  });
}

cliCursor.hide();

function cleanup(): void {
  stopCountdown();
  if (currentRL) {
    currentRL.close();
    currentRL = null;
  }
  cliCursor.show();
  process.stdin.setRawMode(false);
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit();
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit();
});

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on("keypress", (str, key) => {
  if (getState().inConfigMenu) return;

  if (key.name === "p") {
    updateState({ isPaused: !getState().isPaused });
    displayCountdown(getState().secondsLeft, getState().isPaused);
  } else if (key.name === "q") {
    console.log(chalk.yellow("\n👋 Quitting..."));
    cleanup();
    process.exit();
  } else if (key.name === "c") {
    showConfigMenu();
  } else if (key.ctrl && key.name === "c") {
    cleanup();
    process.exit();
  }
});

// Initialize timer
startCountdown(loadConfig().pomodoro);
