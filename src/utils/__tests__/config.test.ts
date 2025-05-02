import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { saveConfig, loadConfig, DEFAULT_CONFIG, resetConfig } from "../config.js";
import * as errors from "../errors.js";
import { TextDecoder } from "node:util";

vi.mock("node:fs");

const testConfigPath = path.join("/tmp", "test-tomate-config.json");
const testDir = path.dirname(testConfigPath);

describe("loadConfig()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should load DEFAULT_CONFIG when config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadConfig(testConfigPath);
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

    const config = loadConfig(testConfigPath);
    expect(config.pomodoro).toBe(1000); // overridden
    expect(config.shortBreak).toBe(DEFAULT_CONFIG.shortBreak); // default
    expect(config.sound.pomodoroEnd).toBe("/custom/path.mp3"); // overridden
    expect(config.sound.breakEnd).toBe("/custom/break.mp3"); // overridden
  });

  it("should return DEFAULT_CONFIG and warn when config file is invalid JSON", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json }");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = loadConfig(testConfigPath);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("⛔ Config load failed"));
  });

  it("should return DEFAULT_CONFIG and warn when config file is invalid by schema", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ pomodoro: -5 }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = loadConfig(testConfigPath);
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

    const config = loadConfig(testConfigPath);
    expect(config.pomodoro).toBe(1234);
    expect(config).not.toHaveProperty("unknownKey");
  });

  it("should return DEFAULT_CONFIG and call displayError on unexpected error", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("Disk error");
    });

    const errorSpy = vi.spyOn(errors, "displayError").mockImplementation(() => {});

    const config = loadConfig(testConfigPath);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(errorSpy).toHaveBeenCalledWith("Unexpected config load error", expect.any(Error));
  });

  it("should merge partial nested config", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ sound: { pomodoroEnd: "/partial/path.mp3" } }),
    );

    const config = loadConfig(testConfigPath);
    expect(config.sound.pomodoroEnd).toBe("/partial/path.mp3");
    expect(config.sound.breakEnd).toBe(DEFAULT_CONFIG.sound.breakEnd);
  });
});

describe("saveConfig()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should write new config when config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    const result = saveConfig({ pomodoro: 999 }, testConfigPath);
    expect(result).toBe(true);
    expect(writeSpy).toHaveBeenCalled();

    const filePath = writeSpy.mock.calls[0][0];
    expect(filePath).toBe(testConfigPath);

    // Get the arguments from the mock
    const data = writeSpy.mock.calls[0][1];
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);
    expect(writtenConfig.pomodoro).toBe(999);
    expect(writtenConfig.shortBreak).toBe(DEFAULT_CONFIG.shortBreak);
    expect(writtenConfig.longBreak).toBe(DEFAULT_CONFIG.longBreak);
    expect(writtenConfig.sound.pomodoroEnd).toBe(DEFAULT_CONFIG.sound.pomodoroEnd);
    expect(writtenConfig.sound.breakEnd).toBe(DEFAULT_CONFIG.sound.breakEnd);
  });

  it("should handle Zod validation errors", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    expect(() => saveConfig({ pomodoro: -10 }, testConfigPath)).toThrowError(z.ZodError);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("should merge and write config when config file exists", () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (path) => typeof path === "string" && path.includes("test-tomate-config.json"),
    );
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        pomodoro: 1500,
        shortBreak: 100,
        longBreak: 900,
        sound: { pomodoroEnd: "/old.mp3", breakEnd: "/oldb.mp3" },
      }),
    );
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    const result = saveConfig({ shortBreak: 222 }, testConfigPath);
    expect(result).toBe(true);
    expect(writeSpy).toHaveBeenCalled();

    const data = writeSpy.mock.calls[0][1];
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);

    expect(writtenConfig.pomodoro).toBe(1500);
    expect(writtenConfig.shortBreak).toBe(222);
    expect(writtenConfig.longBreak).toBe(900);
  });

  it("should create config directory if it does not exist", () => {
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true) // config file exists
      .mockReturnValueOnce(false); // config dir does not exist
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_CONFIG));
    const mkdirSpy = vi.spyOn(fs, "mkdirSync");
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    saveConfig({ pomodoro: 123 }, testConfigPath);
    expect(mkdirSpy).toHaveBeenCalledWith(testDir, { recursive: true });
    expect(writeSpy).toHaveBeenCalled();
  });

  it("should throw and log on invalid config (schema error)", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(() => saveConfig({ pomodoro: -1 }, testConfigPath)).toThrow();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("⛔ Invalid configuration:"));
  });

  it("should call displayError and return false on unexpected error", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error("Disk error");
    });
    const errorSpy = vi.spyOn(errors, "displayError").mockImplementation(() => {});

    const result = saveConfig({ pomodoro: 123 }, testConfigPath);
    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith("Config save failed", expect.any(Error));
  });

  it("should not overwrite unknown keys from previous config", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        pomodoro: 1500,
        shortBreak: 300,
        longBreak: 900,
        sound: { pomodoroEnd: "/old.mp3", breakEnd: "/oldb.mp3" },
        extraKey: "should be ignored",
      }),
    );
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    saveConfig({ pomodoro: 2000 }, testConfigPath);

    const data = writeSpy.mock.calls[0][1];
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);

    expect(writtenConfig).not.toHaveProperty("extraKey");
    expect(writtenConfig.pomodoro).toBe(2000);
  });
});

describe("resetConfig()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should write DEFAULT_CONFIG to file when directory exists", () => {
    const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync");
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    resetConfig(testConfigPath);

    expect(existsSyncSpy).toHaveBeenCalledWith(testDir);
    expect(mkdirSyncSpy).not.toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledWith(testConfigPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  });

  it("should create config directory if it does not exist", () => {
    const existsSyncSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync");
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    resetConfig(testConfigPath);

    expect(existsSyncSpy).toHaveBeenCalledWith(testDir);
    expect(mkdirSyncSpy).toHaveBeenCalledWith(testDir, { recursive: true });
    expect(writeSpy).toHaveBeenCalledWith(testConfigPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  });

  it("should call displayError on unexpected error", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("Disk error");
    });
    const errorSpy = vi.spyOn(errors, "displayError").mockImplementation(() => {});

    resetConfig(testConfigPath);

    expect(errorSpy).toHaveBeenCalledWith("Error resetting config", expect.any(Error));
  });
});
