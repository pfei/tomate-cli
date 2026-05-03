import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { displayError } from "./errors.js";

const SessionSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: z.enum(["pomodoro", "shortBreak", "longBreak"]),
  task: z.string().optional(),
});

const MetricsSchema = z.object({
  sessions: z.array(SessionSchema),
});

export type Session = z.infer<typeof SessionSchema>;
export type PomodoroSession = Session;
export type Metrics = z.infer<typeof MetricsSchema>;
export const DEFAULT_METRICS: Metrics = { sessions: [] };
export type SessionType = "pomodoro" | "shortBreak" | "longBreak";

export interface TaskStats {
  sessions: number;
  totalTimeMs: number;
  totalDecimalHours: number;
  totalTimeHours: string;
}

export type TasksReport = Record<string, TaskStats>;

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

export function getTasksReport(metricsPath: string): TasksReport {
  const metrics = loadMetrics(metricsPath);

  return metrics.sessions
    .filter((s) => s.type === "pomodoro")
    .reduce((acc, s) => {
      const task = s.task || "generic";
      const durationMs = new Date(s.end).getTime() - new Date(s.start).getTime();

      if (!acc[task]) {
        acc[task] = {
          sessions: 0,
          totalTimeMs: 0,
          totalDecimalHours: 0,
          totalTimeHours: "",
        };
      }

      acc[task].sessions += 1;
      acc[task].totalTimeMs += durationMs;
      acc[task].totalDecimalHours = parseFloat((acc[task].totalTimeMs / 3_600_000).toFixed(2));

      const totalSeconds = Math.floor(acc[task].totalTimeMs / 1000);
      const h = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s_ = (totalSeconds % 60).toString().padStart(2, "0");
      acc[task].totalTimeHours = `${h}:${m}:${s_}`;

      return acc;
    }, {} as TasksReport);
}
