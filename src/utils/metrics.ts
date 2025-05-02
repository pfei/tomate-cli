import { z } from "zod";
import { dirname, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { displayError } from "./errors.js";

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

export type SessionType = "pomodoro" | "shortBreak" | "longBreak";
export type Session = { type: SessionType; start: string; end: string };

export function avgDuration(type: SessionType, sessions: Session[]): number {
  const filtered = sessions.filter((s) => s.type === type);
  if (filtered.length === 0) return 0;
  const totalTime = filtered.reduce((sum, s) => {
    return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000;
  }, 0);
  return totalTime / filtered.length;
}

export function totalDuration(type: SessionType, sessions: Session[]): number {
  return sessions
    .filter((s) => s.type === type)
    .reduce((sum, s) => {
      return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000;
    }, 0);
}

export function loadMetrics(metricsPath: string): Metrics {
  try {
    if (!existsSync(metricsPath)) return DEFAULT_METRICS;
    const data = JSON.parse(readFileSync(metricsPath, "utf-8"));
    return MetricsSchema.parse(data);
  } catch (error) {
    displayError("Failed to load metrics", error);
    return DEFAULT_METRICS;
  }
}

export function saveMetrics(metrics: Metrics, metricsPath: string): void {
  try {
    const validated = MetricsSchema.parse(metrics);
    const configDir = dirname(metricsPath);
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
    writeFileSync(metricsPath, JSON.stringify(validated, null, 2));
  } catch (error) {
    displayError("Failed to save metrics", error);
  }
}

export function recordSession(
  session: Omit<PomodoroSession, "end"> & { end?: string },
  metricsPath: string,
): void {
  const metrics = loadMetrics(metricsPath);
  const completeSession = {
    ...session,
    end: session.end || new Date().toISOString(),
  };
  const parsedSession = SessionSchema.parse(completeSession);
  metrics.sessions.push(parsedSession as PomodoroSession);
  saveMetrics(metrics, metricsPath);
}

export function resetMetrics(metricsPath: string): void {
  saveMetrics(DEFAULT_METRICS, metricsPath);
}

export function getMetricsStats(metricsPath: string) {
  const metrics = loadMetrics(metricsPath);
  const totalPomodoros = metrics.sessions.filter((s) => s.type === "pomodoro").length;
  const totalShortBreaks = metrics.sessions.filter((s) => s.type === "shortBreak").length;
  const totalLongBreaks = metrics.sessions.filter((s) => s.type === "longBreak").length;
  const totalPomodoroTimeSeconds = metrics.sessions
    .filter((s) => s.type === "pomodoro")
    .reduce((sum, s) => {
      return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000;
    }, 0);

  return {
    totalPomodoros,
    totalShortBreaks,
    totalLongBreaks,
    totalPomodoroTimeSeconds,
  };
}
