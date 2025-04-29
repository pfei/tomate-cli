import { z } from "zod";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { displayError } from "./errors.js";

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const METRICS_PATH = join(CONFIG_DIR, "tomate-cli", "metrics.json");

const SessionSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: z.enum(["pomodoro", "shortBreak", "longBreak"]),
});

const MetricsSchema = z.object({
  sessions: z.array(SessionSchema),
});

export type PomodoroSession = z.infer<typeof SessionSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;

export const DEFAULT_METRICS: Metrics = { sessions: [] };

export function loadMetrics(): Metrics {
  try {
    if (!existsSync(METRICS_PATH)) return DEFAULT_METRICS;
    const data = JSON.parse(readFileSync(METRICS_PATH, "utf-8"));
    return MetricsSchema.parse(data);
  } catch (error) {
    displayError("Failed to load metrics", error);
    return DEFAULT_METRICS;
  }
}

export function saveMetrics(metrics: Metrics): void {
  try {
    const validated = MetricsSchema.parse(metrics);
    const configDir = join(CONFIG_DIR, "tomate-cli");
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
    writeFileSync(METRICS_PATH, JSON.stringify(validated, null, 2));
  } catch (error) {
    displayError("Failed to save metrics", error);
  }
}

export function recordSession(session: Omit<PomodoroSession, "end"> & { end?: string }): void {
  const metrics = loadMetrics();
  const completeSession = {
    ...session,
    end: session.end || new Date().toISOString(),
  };
  const parsedSession = SessionSchema.parse(completeSession);
  metrics.sessions.push(parsedSession as PomodoroSession);
  saveMetrics(metrics);
}

export function resetMetrics(): void {
  saveMetrics(DEFAULT_METRICS);
}
