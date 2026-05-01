import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configUtils from "../../utils/config.js";
import * as metricsUtils from "../../utils/metrics.js";
import { createState } from "../state.js";

// Mock external dependencies to isolate state logic
vi.mock("../../utils/config.js");
vi.mock("../../utils/metrics.js");

describe("Timer State - Task Labeling", () => {
  const mockConfig = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure loadConfig returns our mock object
    vi.mocked(configUtils.loadConfig).mockReturnValue(mockConfig as any);
  });

  it("should initialize with 'generic' task by default", () => {
    const { getState } = createState("config.json", "metrics.json");
    expect(getState().currentTask).toBe("generic");
  });

  it("should update the current task label correctly", () => {
    const { getState, updateState } = createState("config.json", "metrics.json");

    updateState({ currentTask: "coding" });

    expect(getState().currentTask).toBe("coding");
  });

  it("should pass the task label to recordSession when a cycle ends", () => {
    const { updateState, advanceCycle } = createState("config.json", "metrics.json");
    const recordSpy = vi.spyOn(metricsUtils, "recordSession");

    // Set a specific task
    updateState({ currentTask: "writing-docs", currentMode: "pomodoro" });

    // Trigger cycle completion
    advanceCycle();

    // Verify that the recorded session includes the custom label
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "writing-docs",
        type: "pomodoro",
      }),
      "metrics.json",
    );
  });

  it("should persist the task label during mode transitions", () => {
    const { getState, updateState, advanceCycle } = createState("config.json", "metrics.json");

    updateState({ currentTask: "refactoring" });
    advanceCycle(); // Transition to break mode

    expect(getState().currentTask).toBe("refactoring");
  });
});
