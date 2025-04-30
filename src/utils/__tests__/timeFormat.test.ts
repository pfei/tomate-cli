import { describe, it, expect } from "vitest";
import { formatSecondsAsHMS, formatMinSec, formatTime } from "../timeFormat.js";
import chalk from "chalk";

describe("timeFormat utilities", () => {
  it("formatSecondsAsHMS formats seconds as HH:MM:SS", () => {
    expect(formatSecondsAsHMS(0)).toBe("00:00:00");
    expect(formatSecondsAsHMS(59)).toBe("00:00:59");
    expect(formatSecondsAsHMS(60)).toBe("00:01:00");
    expect(formatSecondsAsHMS(3661)).toBe("01:01:01");
  });

  it("formatMinSec formats seconds as MM:SS", () => {
    expect(formatMinSec(0)).toBe("00:00");
    expect(formatMinSec(59)).toBe("00:59");
    expect(formatMinSec(60)).toBe("01:00");
    expect(formatMinSec(125)).toBe("02:05");
  });

  it("formatTime formats seconds as colored HH:MM:SS", () => {
    const result = formatTime(3661);
    expect(result).toContain(chalk.cyan("01"));
    expect(result).toContain(chalk.yellow(":"));
  });
});
