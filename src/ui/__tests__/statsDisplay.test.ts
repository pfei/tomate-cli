import { describe, it, expect } from "vitest";
import { getUniqueDays, getUniqueWeeks, getDateRange } from "../statsDisplay.js";
import { Session } from "../../utils/metrics.js";

// Example sessions for testing
const sessions: Session[] = [
  { type: "pomodoro", start: "2025-04-29T10:00:00Z", end: "2025-04-29T10:25:00Z" },
  { type: "pomodoro", start: "2025-04-29T11:00:00Z", end: "2025-04-29T11:25:00Z" },
  { type: "pomodoro", start: "2025-04-30T10:00:00Z", end: "2025-04-30T10:25:00Z" },
  { type: "pomodoro", start: "2025-05-01T10:00:00Z", end: "2025-05-01T10:25:00Z" },
  { type: "shortBreak", start: "2025-04-29T10:25:00Z", end: "2025-04-29T10:30:00Z" },
];

describe("statsDisplay helpers (minimal version)", () => {
  it("getUniqueDays returns unique days for pomodoros", () => {
    const pomodoros = sessions.filter((s) => s.type === "pomodoro");
    expect(getUniqueDays(pomodoros).size).toBe(3); // 2025-04-29, 2025-04-30, 2025-05-01
  });

  it("getUniqueWeeks returns unique weeks for pomodoros", () => {
    const pomodoros = sessions.filter((s) => s.type === "pomodoro");
    expect(getUniqueWeeks(pomodoros).size).toBeGreaterThanOrEqual(1);
  });

  it("getDateRange returns the correct date range", () => {
    expect(getDateRange(sessions)).toEqual(["2025-04-29", "2025-05-01"]);
    expect(getDateRange([])).toBeNull();
  });

  it("handles sessions with only breaks", () => {
    const breaks: Session[] = [
      { type: "shortBreak", start: "2025-05-02T10:00:00Z", end: "2025-05-02T10:05:00Z" },
      { type: "longBreak", start: "2025-05-03T11:00:00Z", end: "2025-05-03T11:15:00Z" },
    ];
    expect(getUniqueDays(breaks).size).toBe(2);
    expect(getDateRange(breaks)).toEqual(["2025-05-02", "2025-05-03"]);
  });
});
