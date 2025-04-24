import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import { loadConfig, DEFAULT_CONFIG } from "../config.js";
import * as errors from "../errors.js";

vi.mock("node:fs");

describe("loadConfig()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should load DEFAULT_CONFIG when config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    // vi.mocked(fs.existsSync).mockImplementation(() => {
    //   console.log("Mocked existsSync called!");
    //   return false;
    // });

    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should load and merge config when config file exists and is valid", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        pomodoro: 1000,
        sound: { pomodoroEnd: "/custom/path.mp3", breakEnd: "/custom/break.mp3" },
      }),
    );

    const config = loadConfig();
    expect(config.pomodoro).toBe(1000); // overridden
    expect(config.shortBreak).toBe(DEFAULT_CONFIG.shortBreak); // default
    expect(config.sound.pomodoroEnd).toBe("/custom/path.mp3"); // overridden
    expect(config.sound.breakEnd).toBe("/custom/break.mp3"); // overridden
  });

  it("should return DEFAULT_CONFIG and warn when config file is invalid JSON", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json }");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("⛔ Config load failed"));
  });

  it("should return DEFAULT_CONFIG and warn when config file is invalid by schema", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Missing required keys, or wrong types
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ pomodoro: -5 }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠ Invalid configuration detected"),
    );
  });

  it("should ignore unknown keys and merge only valid config keys", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        pomodoro: 1234,
        unknownKey: "should be ignored",
      }),
    );

    const config = loadConfig();
    expect(config.pomodoro).toBe(1234);
    expect(config).not.toHaveProperty("unknownKey");
  });

  it("should return DEFAULT_CONFIG and call displayError on unexpected error", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("Disk error");
    });

    const errorSpy = vi.spyOn(errors, "displayError").mockImplementation(() => {});

    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(errorSpy).toHaveBeenCalledWith("Unexpected config load error", expect.any(Error));
  });

  it("should merge partial nested config", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ sound: { pomodoroEnd: "/partial/path.mp3" } }),
    );

    const config = loadConfig();
    expect(config.sound.pomodoroEnd).toBe("/partial/path.mp3");
    expect(config.sound.breakEnd).toBe(DEFAULT_CONFIG.sound.breakEnd);
  });
});
