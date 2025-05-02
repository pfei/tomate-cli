import { homedir } from "node:os";
import { join } from "node:path";

export function resolveConfigPath(cliArg?: string): string {
  return (
    cliArg ||
    process.env.TOMATE_CONFIG_PATH ||
    join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "tomate-cli", "config.json")
  );
}

export function resolveMetricsPath(cliArg?: string): string {
  return (
    cliArg ||
    process.env.TOMATE_METRICS_PATH ||
    join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "tomate-cli", "metrics.json")
  );
}
