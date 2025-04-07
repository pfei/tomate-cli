import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import cliCursor from "cli-cursor";
import dotenv from "dotenv";
import readline from "readline";

import { loadConfig, saveConfig } from "./utils/config.js";

// Load environment variables
dotenv.config();

// Audio setup
const audioPath = fileURLToPath(new URL("audio.mp3", new URL("./assets/", import.meta.url)));
if (!existsSync(audioPath)) {
  throw new Error(`Audio file not found: ${audioPath.replace(process.cwd(), ".")}`);
}

// State management
let inConfigMenu = false;
let isPaused = false;
let firstRender = true;
let currentRL: readline.Interface | null = null;

// Function to play audio
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

// Countdown setup
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

function displayCountdown(secondsLeft: number, isPaused: boolean): void {
  if (inConfigMenu) return;

  const timeString = formatTime(secondsLeft);
  const pauseMessage = isPaused ? chalk.red("[PAUSED]") : "";

  const boxedTime = boxen(`${timeString} ${pauseMessage}\n\n` + `[p]ause   [q]uit   [c]onfig`, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    titleAlignment: "center",
  });

  if (firstRender) {
    process.stdout.write(boxedTime + "\n");
    firstRender = false;
  } else {
    process.stdout.write("\x1B[7A\x1B[0J" + boxedTime + "\n");
  }
}

// Popup function
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

// Configuration menu
function showConfigMenu(): void {
  const wasPaused = isPaused;
  isPaused = true;
  inConfigMenu = true;

  const config = loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  currentRL = rl;

  process.stdout.write("\x1B[2J\x1B[0f"); // Clear screen
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
            secondsLeft = secs; // Update current timer
          }
        } else {
          console.log(chalk.red("❌ Invalid duration (must be positive number)"));
        }
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(secondsLeft, wasPaused);
      });
    };

    const cleanupReadline = () => {
      rl.close();
      currentRL = null;
      inConfigMenu = false;
      isPaused = wasPaused;
      process.stdin.setRawMode(true); // Re-enable raw mode after readline
      process.stdin.resume(); // Resume stdin
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
        displayCountdown(secondsLeft, wasPaused);
        break;
      default:
        console.log(chalk.red("⚠ Invalid option"));
        cleanupReadline();
        process.stdout.write("\x1B[2J\x1B[0f");
        displayCountdown(secondsLeft, wasPaused);
    }
  });
}

// Cursor management
cliCursor.hide();

// Cleanup handlers
function cleanup(): void {
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

// Initialize timer
const { pomodoro } = loadConfig();
let secondsLeft = pomodoro;

// Keypress listener
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on("keypress", (str, key) => {
  if (inConfigMenu) return;

  if (key.name === "p") {
    isPaused = !isPaused;
    displayCountdown(secondsLeft, isPaused);
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

// Countdown logic
const countdownInterval = setInterval(() => {
  if (!isPaused && !inConfigMenu) {
    displayCountdown(secondsLeft, isPaused);
    secondsLeft -= 1;

    if (secondsLeft < 0) {
      clearInterval(countdownInterval);
      playAudio();
      console.log(chalk.green("\n🎉 Time's up!"));
      showTimeUpPopup()
        .then(() => process.exit())
        .catch((err) => {
          console.error(chalk.red("Popup error:"), err);
          process.exit(1);
        });
    }
  }
}, 1000);

displayCountdown(secondsLeft, isPaused);
