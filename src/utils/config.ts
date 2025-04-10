import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import { displayError } from "./errors.js";
import { validateAndNotify } from "./validation.js";

export type Config = {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
};

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const CONFIG_PATH = join(CONFIG_DIR, "tomate-cli", "config.json");
export const DEFAULT_CONFIG: Config = {
  pomodoro: 1500,
  shortBreak: 300,
  longBreak: 900,
};

export function loadConfig(): Config {
  try {
    if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;

    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Validate loaded config
    if (!validateAndNotify(mergedConfig)) {
      console.log(chalk.yellow("⚠ Invalid configuration detected. Using defaults."));
      return DEFAULT_CONFIG;
    }

    return mergedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log(chalk.red("⛔ Config load failed: Invalid JSON format."));
      console.log(chalk.yellow("⚠ Reverting to default configuration."));
    } else {
      displayError("Unexpected config load error", error);
    }
    return DEFAULT_CONFIG;
  }
}
export function saveConfig(newConfig: Partial<Config>): boolean {
  try {
    if (!validateAndNotify(newConfig)) {
      return false;
    }

    // Merge with existing config
    const currentConfig = existsSync(CONFIG_PATH)
      ? JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))
      : DEFAULT_CONFIG;
    const updatedConfig = { ...currentConfig, ...newConfig };

    const configDir = join(CONFIG_DIR, "tomate-cli");
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
    return true;
  } catch (error) {
    displayError("Config save failed", error);
    return false;
  }
}

export async function resetConfig(): Promise<void> {
  try {
    const dir = join(CONFIG_DIR, "tomate-cli");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.green("✓ Configuration reset successfully!"));
  } catch (error) {
    displayError("Error resetting config", error);
  }
}
