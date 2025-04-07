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

let firstRender = true;

function displayCountdown(secondsLeft: number, isPaused: boolean): void {
  const timeString = formatTime(secondsLeft);
  const pauseMessage = isPaused ? chalk.red("[PAUSED]") : "";

  const boxedTime = boxen(`${timeString} ${pauseMessage}\n\n[p]ause         [q]uit`, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    titleAlignment: "center",
  });

  if (firstRender) {
    // First render: Just print the timer
    process.stdout.write(boxedTime + "\n");
    firstRender = false;
  } else {
    // Subsequent renders: Move cursor up and overwrite
    process.stdout.write("\x1B[7A\x1B[0J" + boxedTime + "\n");
  }
}

// Function to show a popup using `yad`
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

    // Use existing env vars + add GTK_THEME if present
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

// Cursor management
cliCursor.hide();

// Cleanup handlers
function cleanup(): void {
  cliCursor.show();
}

process.on("exit", cleanup);
process.on("SIGINT", cleanup); // Ctrl+C
process.on("SIGTERM", cleanup); // Termination signal

// Start countdown
const { pomodoro } = loadConfig();
let secondsLeft = pomodoro;

let isPaused = false; // Pause state

// Keypress listener for pause/resume and quit functionality
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on("keypress", (str, key) => {
  if (key.name === "p") {
    isPaused = !isPaused; // Toggle pause state
    displayCountdown(secondsLeft, isPaused); // Update display with pause message
  } else if (key.name === "q") {
    console.log(chalk.yellow("\n👋 Countdown quit by user."));
    cleanup();
    process.exit(); // Exit on 'q' key press
  } else if (key.ctrl && key.name === "c") {
    cleanup();
    process.exit(); // Handle Ctrl+C gracefully
  }
});

// Countdown logic with pause handling
const countdownInterval = setInterval(() => {
  if (!isPaused) {
    // Only decrement timer if not paused
    displayCountdown(secondsLeft, isPaused);
    secondsLeft -= 1;

    if (secondsLeft < 0) {
      clearInterval(countdownInterval);
      playAudio();
      console.log(chalk.green("\n🎉 Time's up!"));

      // Show popup and then cleanup
      showTimeUpPopup()
        .then(() => process.exit())
        .catch((err) => {
          console.error(chalk.red("Popup error:"), err);
          process.exit(1);
        });
    }
  }
}, 1000);

displayCountdown(secondsLeft, isPaused); // Initial render
