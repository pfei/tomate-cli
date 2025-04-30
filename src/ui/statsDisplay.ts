import chalk from "chalk";
import boxen from "boxen";
import { resetMetrics, getMetricsStats, loadMetrics } from "../utils/metrics.js";
import { formatSecondsAsHMS, formatMinSec } from "../utils/timeFormat.js";

export function displayStatsBox() {
  const stats = getMetricsStats();
  const metrics = loadMetrics();

  // Helper to calculate average duration for a given type
  function avgDuration(type: "pomodoro" | "shortBreak" | "longBreak"): number {
    const sessions = metrics.sessions.filter((s) => s.type === type);
    if (sessions.length === 0) return 0;
    const totalTime = sessions.reduce((sum, s) => {
      return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000;
    }, 0);
    return totalTime / sessions.length;
  }

  // Helper to calculate total duration for a given type
  function totalDuration(type: "pomodoro" | "shortBreak" | "longBreak"): number {
    return metrics.sessions
      .filter((s) => s.type === type)
      .reduce((sum, s) => {
        return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 1000;
      }, 0);
  }

  const avgPomodoroSeconds = avgDuration("pomodoro");
  const avgShortBreakSeconds = avgDuration("shortBreak");
  const avgLongBreakSeconds = avgDuration("longBreak");

  const totalBreaksSeconds = totalDuration("shortBreak") + totalDuration("longBreak");

  const content =
    chalk.cyan(`Total Pomodoros: ${stats.totalPomodoros}\n`) +
    chalk.cyan(`Total Pomodoro Time: ${formatSecondsAsHMS(stats.totalPomodoroTimeSeconds)}\n\n`) +
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
      : "");
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
