import { z } from "zod";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import { displayError } from "./errors.js";
import { getState } from "../core/state.js";

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
export const CONFIG_PATH = join(CONFIG_DIR, "tomate-cli", "config.json");

type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

const ConfigSchema = z.object({
  pomodoro: z.number().int().positive(),
  shortBreak: z.number().int().positive(),
  longBreak: z.number().int().positive(),
  sound: z.object({
    pomodoroEnd: z.string().min(1),
    breakEnd: z.string().min(1),
  }),
});
function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

export type Config = z.infer<typeof ConfigSchema>;
export type NumericConfigKey = "pomodoro" | "shortBreak" | "longBreak";

export const DEFAULT_CONFIG: Config = {
  pomodoro: 1500,
  shortBreak: 300,
  longBreak: 900,
  sound: {
    pomodoroEnd: new URL("../assets/sounds/pomodoro-end.mp3", import.meta.url).pathname,
    breakEnd: new URL("../assets/sounds/break-end.mp3", import.meta.url).pathname,
  },
};

function deepMerge<T extends Config>(overrides: DeepPartial<T>, defaults: T): T {
  function isObject(item: any): boolean {
    return typeof item === "object" && item !== null && !Array.isArray(item);
  }
  const result: T = deepCopy(defaults);
  for (const key in overrides) {
    if (overrides.hasOwnProperty(key) && key in defaults) {
      const overrideValue = overrides[key];
      const defaultsValue = defaults[key as keyof T];

      if (isObject(defaultsValue) && isObject(overrideValue)) {
        result[key as keyof T] = deepMerge(
          overrideValue as DeepPartial<typeof defaultsValue>,
          defaultsValue as any,
        ) as any;
      } else {
        result[key as keyof T] = overrideValue as any;
      }
    }
  }

  return result;
}

function deepCopy<T>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item)) as any as T;
  }

  const newObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      newObj[key] = deepCopy(obj[key]);
    }
  }
  return newObj as T;
}

export function loadConfig(): Config {
  try {
    if (!existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;

    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    const mergedConfig: Config = deepMerge(config, DEFAULT_CONFIG);
    const result = ConfigSchema.safeParse(mergedConfig); // Zod validation

    if (!result.success) {
      console.log(chalk.yellow("⚠ Invalid configuration detected. Using defaults."));
      console.log(chalk.dim(formatZodErrors(result.error)));
      return DEFAULT_CONFIG;
    }

    return result.data;
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
    const currentConfig = existsSync(CONFIG_PATH)
      ? JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))
      : DEFAULT_CONFIG;

    const updatedConfig = ConfigSchema.parse({
      ...currentConfig,
      ...newConfig,
    });

    const configDir = join(CONFIG_DIR, "tomate-cli");
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));

    getState().config = updatedConfig;
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log(chalk.red("⛔ Invalid configuration:"));
      console.log(chalk.dim(formatZodErrors(error)));
      throw error; // Rethrow for tests
    } else {
      displayError("Config save failed", error);
    }
    return false;
  }
}

export function resetConfig(): void {
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
