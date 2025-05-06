import boxen from "boxen";
import chalk from "chalk";
import { formatTime } from "../utils/timeFormat.js";
import { TimerState } from "../core/state.js";

let firstRender = true;

type Mode = "pomodoro" | "shortBreak" | "longBreak";
const modeDisplayMap: Record<Mode, string> = {
  pomodoro: "🍅 Pomodoro",
  shortBreak: "☕ Short Break",
  longBreak: "🌴 Long Break",
};

export function displayCountdown(
  secondsLeft: number,
  isPaused: boolean,
  getState: () => TimerState,
): void {
  const state = getState();
  if (state.inConfigMenu) return;

  const mode = state.currentMode as Mode;
  const modeDisplay = modeDisplayMap[mode];

  const timeString = formatTime(secondsLeft);
  const pauseMessage = isPaused ? chalk.red("[PAUSED]") : "";

  const boxedTime = boxen(
    `${modeDisplay} ${timeString} ${pauseMessage}\n\n` + `[p]ause   [q]uit   [c]onfig`,
    {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "round",
      titleAlignment: "center",
      margin: { top: 1, bottom: 1 }, // Add vertical padding
    },
  );

  // Calculate box height
  const boxHeight = boxedTime.split("\n").length;

  // Clear and render logic
  if (firstRender) {
    process.stdout.write("\x1B[2J\x1B[H"); // Full clear
    process.stdout.write(boxedTime + "\n");
    firstRender = false;
  } else {
    const clearSequence =
      "\x1B[1G" + // Move to start of line
      "\x1B[1A\x1B[2K".repeat(boxHeight) + // Move up and clear lines
      "\x1B[H"; // Home cursor

    process.stdout.write(clearSequence + boxedTime + "\n");
  }
}

export function resetDisplayCountdown() {
  firstRender = true;
}
