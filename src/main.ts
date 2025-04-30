// src/main.ts
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import cliCursor from "cli-cursor";
import dotenv from "dotenv";
import readline from "readline";
import { loadConfig, NumericConfigKey, saveConfig } from "./utils/config.js";
import { displayError } from "./utils/errors.js";
import { getState, updateState, resetState, advanceCycle } from "./core/state.js";
import { argv } from "node:process";
import { resetConfig } from "./utils/config.js";
import { playSound } from "./utils/sound.js";
import { displayStatsBox } from "./ui/statsDisplay.js";
import { formatTime } from "./utils/timeFormat.js";
import { displayCountdown, resetDisplayCountdown } from "./ui/displayCountdown.js";
import { showConfigMenu, cleanupConfigMenu } from "./ui/configMenu.js";

// Load environment variables
dotenv.config();

let countdownInterval: NodeJS.Timeout | null = null;

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
  resetDisplayCountdown();

  countdownInterval = setInterval(() => {
    if (!getState().isPaused && !getState().inConfigMenu) {
      displayCountdown(getState().secondsLeft, getState().isPaused);
      updateState({ secondsLeft: getState().secondsLeft - 1 });

      if (getState().secondsLeft < 0) {
        stopCountdown();
        // playAudio();
        playSound(getState().currentMode === "pomodoro" ? "pomodoro" : "break");
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

cliCursor.hide();

function cleanup(): void {
  stopCountdown();
  cleanupConfigMenu();
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

function main() {
  if (argv.includes("--reset-config")) {
    resetConfig();
    process.exit(0);
  } else if (argv.includes("--stats")) {
    displayStatsBox();
    process.exit(0);
  } else {
    try {
      const config = loadConfig();
      startCountdown(config.pomodoro);
    } catch (err) {
      displayError("Failed to initialize", err);
      process.exit(1);
    }
  }
}

main();
