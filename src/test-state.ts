// src/test-state.ts
import { getState, updateState, advanceCycle } from "./core/state.js";
import { existsSync } from "node:fs";

console.log("🔍 Initial State");
console.log("Sound Path:", getState().config.sound.pomodoroEnd);
const soundPath = getState().config.sound.pomodoroEnd;
console.log("Sound file exists:", existsSync(soundPath));

console.log("\n🔧 Updating State");
updateState({ isPaused: true });
console.log("Is Paused:", getState().isPaused);

console.log("\n🔄 Advancing Cycle");
advanceCycle();
console.log("New Mode:", getState().currentMode);

process.exit(0);
