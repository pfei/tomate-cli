import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import cliCursor from "cli-cursor";

// Audio setup
const audioPath = fileURLToPath(new URL("audio.mp3", new URL("./assets/", import.meta.url)));
if (!existsSync(audioPath)) {
  throw new Error(`Audio file not found: ${audioPath.replace(process.cwd(), ".")}`);
}

// Start audio playback
const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", audioPath], {
  detached: true,
  stdio: "ignore",
});

ffplayProcess
  .on("error", (err) => console.error("🎵 Playback failed:", err))
  .on("exit", (code) => code && console.error("Playback stopped with code:", code))
  .unref();

// console.log("🎵 Playing:", audioPath.replace(process.cwd(), "."));

// Clock setup
function formatTime(date: Date, is12h: boolean): string {
  let hours = date.getHours();
  const suffix = is12h ? (hours >= 12 ? " PM" : " AM") : "";

  if (is12h) hours = hours % 12 || 12; // Convert to 12h format

  return [
    chalk.cyan(hours.toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(date.getMinutes().toString().padStart(2, "0")),
    chalk.yellow(":"),
    chalk.cyan(date.getSeconds().toString().padStart(2, "0")),
    is12h ? chalk.magenta(suffix) : "",
  ].join("");
}

let firstRender = true;

function displayClock(is12h: boolean): void {
  const timeString = formatTime(new Date(), is12h);
  const boxedTime = boxen(timeString, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    titleAlignment: "center",
  });

  if (firstRender) {
    // First render: Just print the clock
    process.stdout.write(boxedTime + "\n");
    firstRender = false;
  } else {
    // Subsequent renders: Move cursor up and overwrite
    process.stdout.write("\x1B[5A\x1B[0J" + boxedTime + "\n");
  }
}

// Cursor management
cliCursor.hide();

// Cleanup handlers
function cleanup() {
  cliCursor.show();
  process.exit();
}

process.on("exit", cleanup);
process.on("SIGINT", cleanup); // Ctrl+C
process.on("SIGTERM", cleanup); // Termination signal

// Start clock
const is12h = process.argv.includes("--12h");
setInterval(() => displayClock(is12h), 1000);
displayClock(is12h); // Initial render
