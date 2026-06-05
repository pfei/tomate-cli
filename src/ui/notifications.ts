import { spawn } from "node:child_process";

const modeMessages: Record<string, string> = {
  pomodoro:   "Pomodoro done! Time for a break. 🌻",
  shortBreak: "Break over! Back to work. 🍅",
  longBreak:  "Long break over! Ready to focus? 🍅",
};

export function showTimeUpNotification(mode: string): void {
  const hasDisplay = !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (!hasDisplay) return;

  const message = modeMessages[mode] ?? "Time's up!";

  // notify-send is standard on any Linux desktop (libnotify)
  const proc = spawn("notify-send", ["Tomate CLI 🍅", message, "--urgency=normal", "--expire-time=8000"], {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
  proc.on("error", () => {}); // silently ignore if notify-send not installed
}
