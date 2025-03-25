import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, constants } from "node:fs";

const audioPath = fileURLToPath(new URL("audio.mp3", new URL("./assets/", import.meta.url)));

if (!existsSync(audioPath)) {
  throw new Error(`Audio file not found: ${audioPath.replace(process.cwd(), ".")}`);
}

const ffplayProcess = spawn("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", audioPath], {
  detached: true,
  stdio: "ignore",
});

ffplayProcess
  .on("error", (err) => console.error("🎵 Playback failed:", err))
  .on("exit", (code) => code && console.error("Playback stopped with code:", code))
  .unref();

console.log("🎵 Playing:", audioPath.replace(process.cwd(), "."));
