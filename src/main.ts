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

// Function to play audio
function playAudio(): void {
  const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", audioPath], {
    detached: true,
    stdio: "ignore",
  });

  ffplayProcess
    .on("error", (err) => console.error("🎵 Playback failed:", err))
    .on("exit", (code) => code && console.error("Playback stopped with code:", code))
    .unref();
}

// Countdown setup
function formatTime(secondsLeft: number): string {
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

let firstRender = true;

function displayCountdown(secondsLeft: number): void {
  const timeString = formatTime(secondsLeft);
  const boxedTime = boxen(timeString, {
    padding: 1,
    borderColor: "cyan",
    borderStyle: "round",
    titleAlignment: "center",
    // title: "Countdown Timer",
  });

  if (firstRender) {
    // First render: Just print the timer
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
function cleanup(): void {
  cliCursor.show();
  process.exit();
}

process.on("exit", cleanup);
process.on("SIGINT", cleanup); // Ctrl+C
process.on("SIGTERM", cleanup); // Termination signal

// Start countdown
const durationInSeconds = parseInt(process.argv[2], 10); // Accept duration as command-line argument
if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
  console.error(chalk.red("Please provide a valid countdown duration in seconds as an argument."));
  process.exit(1);
}

let secondsLeft = durationInSeconds;

const countdownInterval = setInterval(() => {
  displayCountdown(secondsLeft);
  secondsLeft -= 1;

  if (secondsLeft < 0) {
    clearInterval(countdownInterval);
    playAudio();
    console.log(chalk.green("\n🎉 Time's up!"));
    cleanup();
  }
}, 1000);

displayCountdown(secondsLeft);
