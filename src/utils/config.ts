import { z } from "zod";
import { dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import { displayError } from "./errors.js";
// import { getState } from "../core/state.js";

type DeepPartial<T> = T extends (...args: unknown[]) => unknown
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

function isPlainObject(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function deepMerge<T extends Record<string, unknown>>(overrides: DeepPartial<T>, defaults: T): T {
  const result: T = deepCopy(defaults);

  for (const key in overrides) {
    if (Object.hasOwn(overrides, key) && key in defaults) {
      const overrideValue = overrides[key];
      const defaultsValue = defaults[key];

      if (isPlainObject(defaultsValue) && isPlainObject(overrideValue)) {
        // Recursively merge only if both are plain objects
        result[key] = deepMerge(
          overrideValue as DeepPartial<Record<string, unknown>>,
          defaultsValue as Record<string, unknown>,
        ) as T[typeof key];
      } else {
        result[key] = overrideValue as T[typeof key];
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
    return obj.map((item) => deepCopy(item)) as unknown as T;
  }

  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      newObj[key] = deepCopy(obj[key]);
    }
  }
  return newObj as T;
}

export function loadConfig(configPath: string): Config {
  try {
    if (!existsSync(configPath)) return DEFAULT_CONFIG;

    const config = JSON.parse(readFileSync(configPath, "utf-8"));
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

export function saveConfig(newConfig: Partial<Config>, configPath: string): boolean {
  try {
    const currentConfig = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, "utf-8"))
      : DEFAULT_CONFIG;

    const updatedConfig = ConfigSchema.parse({
      ...currentConfig,
      ...newConfig,
    });

    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

    // getState().config = updatedConfig;
    // No more getState().config = updatedConfig; -- handled by caller if needed

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

export function resetConfig(configPath: string): void {
  try {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.green("✓ Configuration reset successfully!"));
  } catch (error) {
    displayError("Error resetting config", error);
  }
}
