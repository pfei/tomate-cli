import { describe, it, expect } from "vitest";
import { avgDuration, totalDuration, Session } from "../metrics.js";

describe("metrics helpers", () => {
  const sessions: Session[] = [
    { type: "pomodoro", start: "2025-04-30T10:00:00Z", end: "2025-04-30T10:25:00Z" }, // 1500s
    { type: "pomodoro", start: "2025-04-30T11:00:00Z", end: "2025-04-30T11:30:00Z" }, // 1800s
    { type: "shortBreak", start: "2025-04-30T10:25:00Z", end: "2025-04-30T10:30:00Z" }, // 300s
  ];

  it("avgDuration calculates average duration in seconds", () => {
    expect(avgDuration("pomodoro", sessions)).toBeCloseTo((1500 + 1800) / 2, 0);
    expect(avgDuration("shortBreak", sessions)).toBeCloseTo(300, 0);
    expect(avgDuration("longBreak", sessions)).toBe(0);
  });

  it("totalDuration calculates total duration in seconds", () => {
    expect(totalDuration("pomodoro", sessions)).toBeCloseTo(3300, 0);
    expect(totalDuration("shortBreak", sessions)).toBeCloseTo(300, 0);
    expect(totalDuration("longBreak", sessions)).toBe(0);
  });
});
