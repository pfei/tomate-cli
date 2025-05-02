import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { appendFileSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import cliCursor from "cli-cursor";
import dotenv from "dotenv";
import readline from "readline";
import { loadConfig } from "./utils/config.js";
import { displayError } from "./utils/errors.js";
// import { getState, updateState, resetState, advanceCycle } from "./core/state.js";
import { argv } from "node:process";
import { resetConfig } from "./utils/config.js";
import { playSound } from "./utils/sound.js";
import { displayStatsBox } from "./ui/statsDisplay.js";
import { formatTime } from "./utils/timeFormat.js";
import { displayCountdown, resetDisplayCountdown } from "./ui/displayCountdown.js";
import { showConfigMenu, cleanupConfigMenu } from "./ui/configMenu.js";
import { showTimeUpPopup } from "./ui/notifications.js";
import { resolveConfigPath, resolveMetricsPath } from "./utils/resolvePaths.js";
import { createState } from "./core/state.js";

////////////////////////////////////////////////////
// --- Load environment variables from .env ---
dotenv.config();
////////////////////////////////////////////////////

const knownFlags = [
  "--config-path",
  "--metrics-path",
  "--print-paths",
  "--set-config-path",
  "--set-metrics-path",
  "--reset-config",
  "--stats",
  "--help",
  // add other flags here as needed
];

const unknownFlags = argv.filter((arg) => arg.startsWith("--") && !knownFlags.includes(arg));

if (unknownFlags.length > 0) {
  console.error(`Unknown option(s): ${unknownFlags.join(", ")}`);
  console.error("Use --help to see available options.");
  process.exit(1);
}

function getArgValue(flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index !== -1 && argv.length > index + 1) {
    return argv[index + 1];
  }
  return undefined;
}
const configPathArg = getArgValue("--config-path");
const metricsPathArg = getArgValue("--metrics-path");
const CONFIG_PATH = resolveConfigPath(configPathArg);
const METRICS_PATH = resolveMetricsPath(metricsPathArg);

const state = createState(CONFIG_PATH, METRICS_PATH);
const { getState, updateState, advanceCycle } = state;

// --- Handle early-exit CLI flags before main() ---
if (argv.includes("--print-paths")) {
  console.log("Config path:", CONFIG_PATH);
  console.log("Metrics path:", METRICS_PATH);
  process.exit(0);
}

function updateOrAppendEnvVar(key: string, value: string) {
  const envPath = ".env";
  let content = "";
  if (existsSync(envPath)) {
    content = readFileSync(envPath, "utf8");
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}\n`;
    }
  } else {
    content = `${key}=${value}\n`;
  }
  writeFileSync(envPath, content, "utf8");
}

if (argv.includes("--set-config-path")) {
  const newPath = getArgValue("--set-config-path");
  if (newPath) {
    updateOrAppendEnvVar("TOMATE_CONFIG_PATH", newPath);
    console.log("Config path set in .env");
    process.exit(0);
  } else {
    console.error("Please provide a path after --set-config-path");
    process.exit(1);
  }
}

if (argv.includes("--set-metrics-path")) {
  const newPath = getArgValue("--set-metrics-path");
  if (newPath) {
    updateOrAppendEnvVar("TOMATE_METRICS_PATH", newPath);
    console.log("Metrics path set in .env");
    process.exit(0);
  } else {
    console.error("Please provide a path after --set-metrics-path");
    process.exit(1);
  }
}
// < early exit CLI flags

let countdownInterval: NodeJS.Timeout | null = null;

function startCountdown(initialSeconds: number): void {
  stopCountdown(); // Clear existing interval
  getState().secondsLeft = initialSeconds;
  resetDisplayCountdown();

  countdownInterval = setInterval(() => {
    if (!getState().isPaused && !getState().inConfigMenu) {
      displayCountdown(getState().secondsLeft, getState().isPaused, getState);
      updateState({ secondsLeft: getState().secondsLeft - 1 });

      if (getState().secondsLeft < 0) {
        stopCountdown();
        // playAudio();
        playSound(getState().currentMode === "pomodoro" ? "pomodoro" : "break", getState);
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
    displayCountdown(getState().secondsLeft, getState().isPaused, getState);
  } else if (key.name === "q") {
    console.log(chalk.yellow("\n👋 Quitting..."));
    cleanup();
    process.exit();
  } else if (key.name === "c") {
    showConfigMenu({
      configPath: CONFIG_PATH,
      getState,
      updateState,
    });
  } else if (key.ctrl && key.name === "c") {
    cleanup();
    process.exit();
  }
});

function main() {
  if (argv.includes("--reset-config")) {
    resetConfig(CONFIG_PATH);
    process.exit(0);
  } else if (argv.includes("--stats")) {
    displayStatsBox(METRICS_PATH);
    process.exit(0);
  } else {
    try {
      const config = loadConfig(CONFIG_PATH);
      startCountdown(config.pomodoro);
    } catch (err) {
      displayError("Failed to initialize", err);
      process.exit(1);
    }
  }
}

main();
