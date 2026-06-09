#!/usr/bin/env node

import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import React from "react";
import { render } from "ink";
import { createState } from "./core/state.js";
import { App } from "./ui/App.js";
import { displayHelp } from "./ui/displayHelp.js";
import { displayStatsBox, displayTasksReport } from "./ui/statsDisplay.js";
import { showTimeUpNotification } from "./ui/notifications.js";
import { loadConfig, resetConfig } from "./utils/config.js";
import { displayError } from "./utils/errors.js";
import { getTasksReport } from "./utils/metrics.js";
import { resolveConfigPath, resolveMetricsPath } from "./utils/resolvePaths.js";
import { playSound } from "./utils/sound.js";

dotenv.config();

const knownFlags = [
  "--config-path", "--metrics-path", "--show-paths", "--print-paths",
  "--set-config-path", "--set-metrics-path", "--reset-config",
  "--stats", "--report", "--report-json", "--help", "--task",
];

const unknownFlags = argv.filter((arg) => arg.startsWith("--") && !knownFlags.includes(arg));
if (unknownFlags.length > 0) {
  console.error(`Unknown option(s): ${unknownFlags.join(", ")}`);
  console.error("Use --help to see available options.");
  process.exit(1);
}

function getArgValue(flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index !== -1 && argv.length > index + 1) return argv[index + 1];
  return undefined;
}

const configPathArg = getArgValue("--config-path");
const metricsPathArg = getArgValue("--metrics-path");
const CONFIG_PATH = resolveConfigPath(configPathArg);
const METRICS_PATH = resolveMetricsPath(metricsPathArg);
const taskLabel = getArgValue("--task");

const state = createState(CONFIG_PATH, METRICS_PATH);
const { getState, updateState, advanceCycle, skipCycle } = state;
updateState({ currentTask: taskLabel || "generic" });

if (argv.includes("--print-paths") || argv.includes("--show-paths")) {
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
  if (newPath) { updateOrAppendEnvVar("TOMATE_CONFIG_PATH", newPath); console.log("Config path set in .env"); process.exit(0); }
  else { console.error("Please provide a path after --set-config-path"); process.exit(1); }
}
if (argv.includes("--set-metrics-path")) {
  const newPath = getArgValue("--set-metrics-path");
  if (newPath) { updateOrAppendEnvVar("TOMATE_METRICS_PATH", newPath); console.log("Metrics path set in .env"); process.exit(0); }
  else { console.error("Please provide a path after --set-metrics-path"); process.exit(1); }
}
if (argv.includes("--help")) { displayHelp(); process.exit(0); }

function main() {
  if (argv.includes("--reset-config")) {
    resetConfig(CONFIG_PATH); process.exit(0);
  } else if (argv.includes("--stats")) {
    displayStatsBox(METRICS_PATH); process.exit(0);
  } else if (argv.includes("--report")) {
    displayTasksReport(METRICS_PATH); process.exit(0);
  } else if (argv.includes("--report-json")) {
    console.log(JSON.stringify(getTasksReport(METRICS_PATH), null, 2)); process.exit(0);
  } else {
    try {
      const config = loadConfig(CONFIG_PATH);
      updateState({ secondsLeft: config.pomodoro });
      process.stdout.write('\x1B[2J\x1B[H');
      const { unmount } = render(
        React.createElement(App, {
          configPath: CONFIG_PATH,
          getState,
          updateState,
          skipCycle,
          onQuit: () => { unmount(); process.exit(0); },
          onTimeUp: () => {
            showTimeUpNotification(getState().currentMode);
            playSound(getState().currentMode === "pomodoro" ? "pomodoro" : "break", getState);
            advanceCycle();
            updateState({ secondsLeft: getState().secondsLeft });
          },
        }),
      );
    } catch (err) {
      displayError("Failed to initialize", err);
      process.exit(1);
    }
  }
}

main();
