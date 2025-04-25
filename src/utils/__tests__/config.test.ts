import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import { saveConfig, loadConfig, DEFAULT_CONFIG, CONFIG_PATH } from "../config.js";
import * as errors from "../errors.js";
import * as state from "../../core/state.js";
import { TextDecoder } from "node:util";

vi.mock("node:fs");

describe("loadConfig()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should load DEFAULT_CONFIG when config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
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

describe("saveConfig()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // vi.spyOn(console, "log").mockImplementation(() => {});
    // vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should write new config when config file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.spyOn(fs, "writeFileSync");
    const getStateSpy = vi.spyOn(state, "getState").mockReturnValue({
      isPaused: false,
      inConfigMenu: false,
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: 0,
      config: DEFAULT_CONFIG,
    });

    const result = saveConfig({ pomodoro: 999 });
    expect(result).toBe(true);
    expect(writeSpy).toHaveBeenCalled();

    const filePath = writeSpy.mock.calls[0][0];
    expect(filePath).toBe(CONFIG_PATH);

    // Get the arguments from the mock
    const data = writeSpy.mock.calls[0][1]; // Data (string | ArrayBufferView)
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      // Convert ArrayBufferView (e.g., Uint8Array) to a string
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);
    expect(writtenConfig.pomodoro).toBe(999);
    expect(writtenConfig.shortBreak).toBe(DEFAULT_CONFIG.shortBreak);
    expect(writtenConfig.longBreak).toBe(DEFAULT_CONFIG.longBreak);
    expect(writtenConfig.sound.pomodoroEnd).toBe(DEFAULT_CONFIG.sound.pomodoroEnd);
    expect(writtenConfig.sound.breakEnd).toBe(DEFAULT_CONFIG.sound.breakEnd);

    expect(getStateSpy.mock.results[0].value.config).toEqual(writtenConfig);
  });

  it("should handle Zod validation errors", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const writeSpy = vi.spyOn(fs, "writeFileSync");
    const getStateSpy = vi.spyOn(state, "getState").mockReturnValue({
      isPaused: false,
      inConfigMenu: false,
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: 0,
      config: DEFAULT_CONFIG,
    });

    expect(() => saveConfig({ pomodoro: -10 })).toThrowError(z.ZodError);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("should merge and write config when config file exists", () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (path) => typeof path === "string" && path.includes("config.json"),
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

    const getStateSpy = vi.spyOn(state, "getState").mockReturnValue({
      isPaused: false,
      inConfigMenu: false,
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: 0,
      config: DEFAULT_CONFIG,
    });

    const result = saveConfig({ shortBreak: 222 });
    expect(result).toBe(true);
    expect(writeSpy).toHaveBeenCalled();

    // Get the arguments from the mock
    const data = writeSpy.mock.calls[0][1]; // Data (string | ArrayBufferView)
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      // Convert ArrayBufferView (e.g., Uint8Array) to a string
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);

    expect(writtenConfig.pomodoro).toBe(1500);
    expect(writtenConfig.shortBreak).toBe(222);
    expect(writtenConfig.longBreak).toBe(900);
    expect(getStateSpy.mock.results[0].value.config).toEqual(writtenConfig);
  });

  it("should create config directory if it does not exist", () => {
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true) // config file exists
      .mockReturnValueOnce(false); // config dir does not exist
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_CONFIG));
    const mkdirSpy = vi.spyOn(fs, "mkdirSync");
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    const getStateSpy = vi.spyOn(state, "getState").mockReturnValue({
      isPaused: false,
      inConfigMenu: false,
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: 0,
      config: DEFAULT_CONFIG,
    });

    saveConfig({ pomodoro: 123 });
    expect(mkdirSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(writeSpy).toHaveBeenCalled();
  });

  it("should throw and log on invalid config (schema error)", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(() => saveConfig({ pomodoro: -1 })).toThrow();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("⛔ Invalid configuration:"));
  });

  it("should call displayError and return false on unexpected error", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error("Disk error");
    });
    const errorSpy = vi.spyOn(errors, "displayError").mockImplementation(() => {});

    const result = saveConfig({ pomodoro: 123 });
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
    const getStateSpy = vi.spyOn(state, "getState").mockReturnValue({
      isPaused: false,
      inConfigMenu: false,
      currentMode: "pomodoro",
      currentCycle: 0,
      secondsLeft: 0,
      config: DEFAULT_CONFIG,
    });

    saveConfig({ pomodoro: 2000 });

    // Get the arguments from the mock
    const data = writeSpy.mock.calls[0][1]; // Data (string | ArrayBufferView)
    let configString: string;
    if (typeof data === "string") {
      configString = data;
    } else {
      // Convert ArrayBufferView (e.g., Uint8Array) to a string
      configString = new TextDecoder().decode(data);
    }
    const writtenConfig = JSON.parse(configString);

    expect(writtenConfig).not.toHaveProperty("extraKey");
    expect(writtenConfig.pomodoro).toBe(2000);
  });
});
