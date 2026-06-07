import React, { useState } from "react";
import { TimerScreen } from "./TimerScreen.js";
import { ConfigScreen } from "./ConfigScreen.js";
import { TimeUpScreen } from "./TimeUpScreen.js";
import { TimerState } from "../core/state.js";

type AppScreen = "timer" | "config" | "timeup";

interface Props {
  configPath: string;
  getState: () => TimerState;
  updateState: (partial: Partial<TimerState>) => void;
  advanceCycle: () => void;
  onQuit: () => void;
  onTimeUp: () => void;
}

export function App({ configPath, getState, updateState, advanceCycle, onQuit, onTimeUp }: Props) {
  const [screen, setScreen] = useState<AppScreen>("timer");
  const [completedMode, setCompletedMode] = useState<string>("pomodoro");

  if (screen === "config") {
    return (
      <ConfigScreen
        configPath={configPath}
        getState={getState}
        updateState={updateState}
        onBack={() => setScreen("timer")}
      />
    );
  }

  if (screen === "timeup") {
    return (
      <TimeUpScreen
        mode={completedMode}
        onDone={() => {
          onTimeUp();
          setScreen("timer");
        }}
      />
    );
  }

  return (
    <TimerScreen
      getState={getState}
      updateState={updateState}
      onQuit={onQuit}
      onConfig={() => setScreen("config")}
      onTimeUp={() => {
        setCompletedMode(getState().currentMode);
        setScreen("timeup");
      }}
    />
  );
}
