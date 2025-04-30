import chalk from "chalk";

export function formatSecondsAsHMS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

export function formatMinSec(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTime(secondsLeft: number): string {
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return [
    chalk.cyan(hours.toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(minutes.toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(seconds.toString().padStart(2, "0")),
  ].join("");
}
