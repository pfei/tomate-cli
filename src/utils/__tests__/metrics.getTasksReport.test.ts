import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTasksReport } from "../metrics.js";

vi.mock("node:fs");

const METRICS_PATH = "/fake/metrics.json";

type SessionInput = {
  type: "pomodoro" | "shortBreak" | "longBreak";
  task?: string;
  start: string;
  end: string;
};

function stubSessions(sessions: SessionInput[]) {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ sessions }));
}

// ---------------------------------------------------------------------------

describe("getTasksReport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns an empty object when there are no sessions", () => {
    stubSessions([]);
    expect(getTasksReport(METRICS_PATH)).toEqual({});
  });

  it("ignores shortBreak and longBreak sessions", () => {
    stubSessions([
      { type: "shortBreak", start: "2025-04-29T09:00:00Z", end: "2025-04-29T09:05:00Z" },
      { type: "longBreak", start: "2025-04-29T10:00:00Z", end: "2025-04-29T10:15:00Z" },
    ]);
    expect(getTasksReport(METRICS_PATH)).toEqual({});
  });

  it("groups a single pomodoro session under its task", () => {
    // 25 min = 1 500 000 ms
    stubSessions([
      {
        type: "pomodoro",
        task: "myproject",
        start: "2025-04-29T09:00:00Z",
        end: "2025-04-29T09:25:00Z",
      },
    ]);
    const report = getTasksReport(METRICS_PATH);

    expect(report["myproject"].sessions).toBe(1);
    expect(report["myproject"].totalTimeMs).toBe(25 * 60 * 1000);
    expect(report["myproject"].totalTimeHours).toBe("00:25:00");
    expect(report["myproject"].totalDecimalHours).toBeCloseTo(0.42, 1);
  });

  it("falls back to 'generic' when task is undefined", () => {
    stubSessions([
      { type: "pomodoro", start: "2025-04-29T09:00:00Z", end: "2025-04-29T09:25:00Z" },
    ]);
    const report = getTasksReport(METRICS_PATH);

    expect(report["generic"]).toBeDefined();
    expect(report["generic"].sessions).toBe(1);
  });

  it("accumulates multiple sessions for the same task", () => {
    // Two 25-min sessions → 50 min total
    stubSessions([
      {
        type: "pomodoro",
        task: "myproject",
        start: "2025-04-29T09:00:00Z",
        end: "2025-04-29T09:25:00Z",
      },
      {
        type: "pomodoro",
        task: "myproject",
        start: "2025-04-29T10:00:00Z",
        end: "2025-04-29T10:25:00Z",
      },
    ]);
    const report = getTasksReport(METRICS_PATH);

    expect(report["myproject"].sessions).toBe(2);
    expect(report["myproject"].totalTimeMs).toBe(50 * 60 * 1000);
    expect(report["myproject"].totalTimeHours).toBe("00:50:00");
  });

  it("keeps different tasks separate", () => {
    stubSessions([
      {
        type: "pomodoro",
        task: "alpha",
        start: "2025-04-29T09:00:00Z",
        end: "2025-04-29T09:25:00Z",
      },
      {
        type: "pomodoro",
        task: "beta",
        start: "2025-04-29T10:00:00Z",
        end: "2025-04-29T11:00:00Z",
      }, // 60 min
    ]);
    const report = getTasksReport(METRICS_PATH);

    expect(Object.keys(report)).toHaveLength(2);
    expect(report["alpha"].sessions).toBe(1);
    expect(report["beta"].totalTimeMs).toBe(60 * 60 * 1000);
    expect(report["beta"].totalTimeHours).toBe("01:00:00");
    expect(report["beta"].totalDecimalHours).toBe(1);
  });

  it("formats totalTimeHours correctly when duration exceeds one hour", () => {
    // 3 × 25 min = 75 min = 1h15m
    stubSessions([
      {
        type: "pomodoro",
        task: "longwork",
        start: "2025-04-29T09:00:00Z",
        end: "2025-04-29T09:25:00Z",
      },
      {
        type: "pomodoro",
        task: "longwork",
        start: "2025-04-29T10:00:00Z",
        end: "2025-04-29T10:25:00Z",
      },
      {
        type: "pomodoro",
        task: "longwork",
        start: "2025-04-29T11:00:00Z",
        end: "2025-04-29T11:25:00Z",
      },
    ]);
    expect(getTasksReport(METRICS_PATH)["longwork"].totalTimeHours).toBe("01:15:00");
  });

  it("rounds totalDecimalHours to 2 decimal places", () => {
    // 1 min = 1/60 h ≈ 0.02
    stubSessions([
      {
        type: "pomodoro",
        task: "tiny",
        start: "2025-04-29T09:00:00Z",
        end: "2025-04-29T09:01:00Z",
      },
    ]);
    const dec = getTasksReport(METRICS_PATH)["tiny"].totalDecimalHours;
    expect(dec.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it("returns an empty object when the metrics file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(getTasksReport(METRICS_PATH)).toEqual({});
  });
});
