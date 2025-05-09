import { describe, it, expect } from "vitest";
import { avgDuration, totalDuration, Session } from "../metrics.js";

describe("metrics helpers", () => {
  const sessions: Session[] = [
    { type: "pomodoro", start: "2025-04-30T10:00:00Z", end: "2025-04-30T10:25:00Z" }, // 1500s
    { type: "pomodoro", start: "2025-04-30T11:00:00Z", end: "2025-04-30T11:30:00Z" }, // 1800s
    { type: "shortBreak", start: "2025-04-30T10:25:00Z", end: "2025-04-30T10:30:00Z" }, // 300s
    { type: "longBreak", start: "2025-04-30T12:00:00Z", end: "2025-04-30T12:15:00Z" }, // 900s
  ];

  it("avgDuration calculates average duration in seconds", () => {
    expect(avgDuration("pomodoro", sessions)).toBeCloseTo((1500 + 1800) / 2, 0);
    expect(avgDuration("shortBreak", sessions)).toBeCloseTo(300, 0);
    expect(avgDuration("longBreak", sessions)).toBeCloseTo(900, 0);
    expect(avgDuration("pomodoro", [])).toBe(0);
    expect(avgDuration("shortBreak", [])).toBe(0);
  });

  it("totalDuration calculates total duration in seconds", () => {
    expect(totalDuration("pomodoro", sessions)).toBeCloseTo(3300, 0);
    expect(totalDuration("shortBreak", sessions)).toBeCloseTo(300, 0);
    expect(totalDuration("longBreak", sessions)).toBeCloseTo(900, 0);
    expect(totalDuration("pomodoro", [])).toBe(0);
  });

  it("handles sessions with only breaks", () => {
    const breaks: Session[] = [
      { type: "shortBreak", start: "2025-05-01T10:00:00Z", end: "2025-05-01T10:05:00Z" },
      { type: "longBreak", start: "2025-05-01T11:00:00Z", end: "2025-05-01T11:15:00Z" },
    ];
    expect(avgDuration("pomodoro", breaks)).toBe(0);
    expect(totalDuration("pomodoro", breaks)).toBe(0);
    expect(avgDuration("shortBreak", breaks)).toBe(300);
    expect(totalDuration("longBreak", breaks)).toBe(900);
  });

  it("returns 0 for invalid types", () => {
    // @ts-expect-error: intentionally passing invalid type to test fallback behavior
    expect(avgDuration("invalidType", sessions)).toBe(0);
    // @ts-expect-error: intentionally passing invalid type to test fallback behavior
    expect(totalDuration("invalidType", sessions)).toBe(0);
  });
});
