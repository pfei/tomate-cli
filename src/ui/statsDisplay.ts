import chalk from "chalk";
import boxen from "boxen";
import { formatSecondsAsHMS, formatMinSec } from "../utils/timeFormat.js";
import { avgDuration, totalDuration } from "../utils/metrics.js";
import { loadMetrics, getMetricsStats } from "../utils/metrics.js";

export function displayStatsBox(metricsPath: string) {
  const stats = getMetricsStats(metricsPath);
  const metrics = loadMetrics(metricsPath);

  const avgPomodoroSeconds = avgDuration("pomodoro", metrics.sessions);
  const avgShortBreakSeconds = avgDuration("shortBreak", metrics.sessions);
  const avgLongBreakSeconds = avgDuration("longBreak", metrics.sessions);
  const totalBreaksSeconds =
    totalDuration("shortBreak", metrics.sessions) + totalDuration("longBreak", metrics.sessions);

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
