import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import chalk from "chalk";

type Config = {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
};

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const CONFIG_PATH = join(CONFIG_DIR, "tomate-cli", "config.json");
const DEFAULT_CONFIG: Config = {
  pomodoro: 1500,
  shortBreak: 300,
  longBreak: 900,
};

export function loadConfig(): Config {
  try {
    if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (error) {
    console.error(chalk.red("⚠ Error loading config:"), error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config): void {
  try {
    const dir = join(CONFIG_DIR, "tomate-cli");
    if (!existsSync(dir)) {
      require("node:fs").mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red("⚠ Error saving config:"), error);
  }
}
