import chalk from "chalk";
import boxen from "boxen";
import { formatSecondsAsHMS, formatMinSec } from "../utils/timeFormat.js";
import { avgDuration, totalDuration } from "../utils/metrics.js";
import { loadMetrics, getMetricsStats } from "../utils/metrics.js";
import { format, parseISO } from "date-fns";
import type { Session } from "../utils/metrics.js";

export function getUniqueDays(sessions: Session[]): Set<string> {
  return new Set(sessions.map((s) => s.start.slice(0, 10)));
}

export function getUniqueWeeks(sessions: Session[]): Set<string> {
  return new Set(sessions.map((s) => format(parseISO(s.start), "yyyy-'W'II")));
}

export function getDateRange(sessions: Session[]): [string, string] | null {
  if (!sessions.length) return null;
  const dates = sessions.map((s) => parseISO(s.start));
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  return [min.toISOString().slice(0, 10), max.toISOString().slice(0, 10)];
}

export function displayStatsBox(metricsPath: string) {
  const stats = getMetricsStats(metricsPath);
  const metrics = loadMetrics(metricsPath);

  const pomodoroSessions = metrics.sessions.filter((s) => s.type === "pomodoro");

  const daySet = getUniqueDays(pomodoroSessions);
  const weekSet = getUniqueWeeks(pomodoroSessions);

  // Total pomodoro work time in seconds
  const totalPomodoroSeconds = stats.totalPomodoroTimeSeconds;

  // Average per day/week (avoid division by zero)
  const avgDaySeconds = daySet.size ? totalPomodoroSeconds / daySet.size : 0;
  const avgWeekSeconds = weekSet.size ? totalPomodoroSeconds / weekSet.size : 0;

  // Date range (from first to last session)
  const dateRange = getDateRange(metrics.sessions);
  let dateRangeLine = "";
  if (dateRange) {
    dateRangeLine = `From ${dateRange[0]} to ${dateRange[1]}\n`;
  }

  const avgPomodoroSeconds = avgDuration("pomodoro", metrics.sessions);
  const avgShortBreakSeconds = avgDuration("shortBreak", metrics.sessions);
  const avgLongBreakSeconds = avgDuration("longBreak", metrics.sessions);
  const totalBreaksSeconds =
    totalDuration("shortBreak", metrics.sessions) + totalDuration("longBreak", metrics.sessions);

  const content =
    chalk.cyan(`Total Pomodoros: ${stats.totalPomodoros}\n`) +
    chalk.cyan(`Total Pomodoro Time: ${formatSecondsAsHMS(stats.totalPomodoroTimeSeconds)}\n`) +
    chalk.cyan(dateRangeLine) +
    "\n" +
    (stats.totalPomodoros
      ? `Average Pomodoro Duration: ${formatMinSec(avgPomodoroSeconds)}\n`
      : "") +
    `Total Breaks Time: ${formatSecondsAsHMS(totalBreaksSeconds)}\n` +
    `Short Breaks: ${stats.totalShortBreaks}\n` +
    (stats.totalShortBreaks
      ? `Average Short Break Duration: ${formatMinSec(avgShortBreakSeconds)}\n`
      : "") +
    `Long Breaks: ${stats.totalLongBreaks}\n` +
    (stats.totalLongBreaks
      ? `Average Long Break Duration: ${formatMinSec(avgLongBreakSeconds)}\n`
      : "") +
    "\n" +
    chalk.yellow(`Average Worked per Day: ${formatSecondsAsHMS(avgDaySeconds)}\n`) +
    chalk.yellow(`Average Worked per Week: ${formatSecondsAsHMS(avgWeekSeconds)}\n`);

  const boxedOutput = boxen(content, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    title: "📊 Pomodoro Statistics",
    titleAlignment: "center",
    margin: { top: 1, bottom: 1 },
  });

  console.log(boxedOutput);
}
