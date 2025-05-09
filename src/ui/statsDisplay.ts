import chalk from "chalk";
import boxen from "boxen";
import { formatSecondsAsHMS, formatMinSec } from "../utils/timeFormat.js";
import { avgDuration, totalDuration } from "../utils/metrics.js";
import { loadMetrics, getMetricsStats } from "../utils/metrics.js";

import { format, parseISO, differenceInCalendarDays } from "date-fns";

export function displayStatsBox(metricsPath: string) {
  const stats = getMetricsStats(metricsPath);
  const metrics = loadMetrics(metricsPath);

  const pomodoroSessions = metrics.sessions.filter((s) => s.type === "pomodoro");

  // Gather unique days and weeks
  const daySet = new Set<string>();
  const weekSet = new Set<string>();
  for (const s of pomodoroSessions) {
    const day = s.start.slice(0, 10);
    daySet.add(day);
    const week = format(parseISO(s.start), "yyyy-'W'II");
    weekSet.add(week);
  }

  // Total pomodoro work time in seconds
  const totalPomodoroSeconds = stats.totalPomodoroTimeSeconds;

  // Average per day/week (avoid division by zero)
  const avgDaySeconds = daySet.size ? totalPomodoroSeconds / daySet.size : 0;
  const avgWeekSeconds = weekSet.size ? totalPomodoroSeconds / weekSet.size : 0;

  // Most productive day
  const pomodorosByDay: Record<string, number> = {};
  for (const s of pomodoroSessions) {
    const day = s.start.slice(0, 10);
    pomodorosByDay[day] = (pomodorosByDay[day] || 0) + 1;
  }
  const mostProductiveDay = Object.entries(pomodorosByDay).sort((a, b) => b[1] - a[1])[0];

  // Longest streak
  const sortedDays = [...daySet].sort();
  let longestStreak = 0,
    currentStreak = 0,
    prevDate: Date | null = null;
  for (const day of sortedDays) {
    const date = parseISO(day);
    if (prevDate && differenceInCalendarDays(date, prevDate) === 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    prevDate = date;
  }

  // Date range (from first to last session)
  const allSessionDates = metrics.sessions.map((s) => parseISO(s.start));
  let dateRangeLine = "";
  if (allSessionDates.length > 0) {
    const minDate = new Date(Math.min(...allSessionDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allSessionDates.map((d) => d.getTime())));
    dateRangeLine = `From ${minDate.toISOString().slice(0, 10)} to ${maxDate.toISOString().slice(0, 10)}\n`;
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
    chalk.yellow(`Average Worked per Week: ${formatSecondsAsHMS(avgWeekSeconds)}\n`) +
    (mostProductiveDay
      ? chalk.yellow(
          `Most Productive Day: ${mostProductiveDay[0]} (${mostProductiveDay[1]} pomodoros)\n`,
        )
      : "") +
    chalk.yellow(`Longest Daily Streak: ${longestStreak} day(s)\n`);

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

// export function displayStatsBox(metricsPath: string) {
//   const stats = getMetricsStats(metricsPath);
//   const metrics = loadMetrics(metricsPath);

//   const pomodoroSessions = metrics.sessions.filter((s: any) => s.type === "pomodoro");

//   // Gather unique days and weeks
//   const daySet = new Set<string>();
//   const weekSet = new Set<string>();
//   for (const s of pomodoroSessions) {
//     const day = s.start.slice(0, 10);
//     daySet.add(day);
//     const week = format(parseISO(s.start), "yyyy-'W'II");
//     weekSet.add(week);
//   }

//   // Total pomodoro work time in seconds
//   const totalPomodoroSeconds = stats.totalPomodoroTimeSeconds;

//   // Average per day/week (avoid division by zero)
//   const avgDaySeconds = daySet.size ? totalPomodoroSeconds / daySet.size : 0;
//   const avgWeekSeconds = weekSet.size ? totalPomodoroSeconds / weekSet.size : 0;

//   // Most productive day
//   const pomodorosByDay: Record<string, number> = {};
//   for (const s of pomodoroSessions) {
//     const day = s.start.slice(0, 10);
//     pomodorosByDay[day] = (pomodorosByDay[day] || 0) + 1;
//   }
//   const mostProductiveDay = Object.entries(pomodorosByDay).sort((a, b) => b[1] - a[1])[0];

//   // Longest streak
//   const sortedDays = [...daySet].sort();
//   let longestStreak = 0,
//     currentStreak = 0,
//     prevDate: Date | null = null;
//   for (const day of sortedDays) {
//     const date = parseISO(day);
//     if (
//       prevDate &&
//       differenceInCalendarWeeks(date, prevDate, { weekStartsOn: 1 }) === 0 &&
//       date.getTime() - prevDate.getTime() === 24 * 3600 * 1000
//     ) {
//       currentStreak++;
//     } else {
//       currentStreak = 1;
//     }
//     if (currentStreak > longestStreak) longestStreak = currentStreak;
//     prevDate = date;
//   }

//   const avgPomodoroSeconds = avgDuration("pomodoro", metrics.sessions);
//   const avgShortBreakSeconds = avgDuration("shortBreak", metrics.sessions);
//   const avgLongBreakSeconds = avgDuration("longBreak", metrics.sessions);
//   const totalBreaksSeconds =
//     totalDuration("shortBreak", metrics.sessions) + totalDuration("longBreak", metrics.sessions);

//   const content =
//     chalk.cyan(`Total Pomodoros: ${stats.totalPomodoros}\n`) +
//     chalk.cyan(`Total Pomodoro Time: ${formatSecondsAsHMS(stats.totalPomodoroTimeSeconds)}\n\n`) +
//     (stats.totalPomodoros
//       ? `Average Pomodoro Duration: ${formatMinSec(avgPomodoroSeconds)}\n`
//       : "") +
//     `Total Breaks Time: ${formatSecondsAsHMS(totalBreaksSeconds)}\n` +
//     `Short Breaks: ${stats.totalShortBreaks}\n` +
//     (stats.totalShortBreaks
//       ? `Average Short Break Duration: ${formatMinSec(avgShortBreakSeconds)}\n`
//       : "") +
//     `Long Breaks: ${stats.totalLongBreaks}\n` +
//     (stats.totalLongBreaks
//       ? `Average Long Break Duration: ${formatMinSec(avgLongBreakSeconds)}\n`
//       : "") +
//     `\n` +
//     chalk.yellow(`Average Worked per Day: ${formatSecondsAsHMS(avgDaySeconds)}\n`) +
//     chalk.yellow(`Average Worked per Week: ${formatSecondsAsHMS(avgWeekSeconds)}\n`) +
//     (mostProductiveDay
//       ? chalk.yellow(
//           `Most Productive Day: ${mostProductiveDay[0]} (${mostProductiveDay[1]} pomodoros)\n`,
//         )
//       : "") +
//     chalk.yellow(`Longest Daily Streak: ${longestStreak} day(s)\n`);

//   const boxedOutput = boxen(content, {
//     padding: 1,
//     borderColor: "cyan",
//     borderStyle: "round",
//     title: "📊 Pomodoro Statistics",
//     titleAlignment: "center",
//     margin: { top: 1, bottom: 1 },
//   });

//   console.log(boxedOutput);
// }

// export function displayStatsBox(metricsPath: string) {
//   const stats = getMetricsStats(metricsPath);
//   const metrics = loadMetrics(metricsPath);

//   const avgPomodoroSeconds = avgDuration("pomodoro", metrics.sessions);
//   const avgShortBreakSeconds = avgDuration("shortBreak", metrics.sessions);
//   const avgLongBreakSeconds = avgDuration("longBreak", metrics.sessions);
//   const totalBreaksSeconds =
//     totalDuration("shortBreak", metrics.sessions) + totalDuration("longBreak", metrics.sessions);

//   const content =
//     chalk.cyan(`Total Pomodoros: ${stats.totalPomodoros}\n`) +
//     chalk.cyan(`Total Pomodoro Time: ${formatSecondsAsHMS(stats.totalPomodoroTimeSeconds)}\n\n`) +
//     (stats.totalPomodoros
//       ? `Average Pomodoro Duration: ${formatMinSec(avgPomodoroSeconds)}\n`
//       : "") +
//     `Total Breaks Time: ${formatSecondsAsHMS(totalBreaksSeconds)}\n` +
//     `Short Breaks: ${stats.totalShortBreaks}\n` +
//     (stats.totalShortBreaks
//       ? `Average Short Break Duration: ${formatMinSec(avgShortBreakSeconds)}\n`
//       : "") +
//     `Long Breaks: ${stats.totalLongBreaks}\n` +
//     (stats.totalLongBreaks
//       ? `Average Long Break Duration: ${formatMinSec(avgLongBreakSeconds)}\n`
//       : "");
//   const boxedOutput = boxen(content, {
//     padding: 1,
//     borderColor: "cyan",
//     borderStyle: "round",
//     title: "📊 Pomodoro Statistics",
//     titleAlignment: "center",
//     margin: { top: 1, bottom: 1 },
//   });

//   console.log(boxedOutput);
// }
