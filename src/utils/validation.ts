import chalk from "chalk";
import type { Config } from "./config.js";

// Validate individual duration
export function validateDuration(seconds: number): boolean {
  return (
    Number.isInteger(seconds) && seconds > 0 && seconds <= 86400 // 24 hours
  );
}

// Validate complete config object
export function validateConfig(config: Partial<Config>): string[] {
  const errors: string[] = [];

  // Pomodoro validation
  if (config.pomodoro !== undefined) {
    if (!validateDuration(config.pomodoro)) {
      errors.push(
        chalk`{red Pomodoro duration must be between 1-86400 seconds (got ${config.pomodoro})}`,
      );
    }
  }

  // Short break validation
  if (config.shortBreak !== undefined) {
    if (!validateDuration(config.shortBreak)) {
      errors.push(
        chalk`{red Short break must be between 1-86400 seconds (got ${config.shortBreak})}`,
      );
    }
  }

  // Long break validation
  if (config.longBreak !== undefined) {
    if (!validateDuration(config.longBreak)) {
      errors.push(
        chalk`{red Long break must be between 1-86400 seconds (got ${config.longBreak})}`,
      );
    }
  }

  return errors;
}

// User-friendly validation wrapper
export function validateAndNotify(config: Partial<Config>): boolean {
  const errors = validateConfig(config);

  if (errors.length > 0) {
    console.log(chalk.bold("\n⛔ Invalid configuration:"));
    errors.forEach((err) => console.log(`  - ${err}`));
    console.log(); // Extra newline
    return false;
  }

  return true;
}
