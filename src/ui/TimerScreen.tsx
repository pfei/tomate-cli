import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TimerState } from "../core/state.js";
import { formatTime } from "../utils/timeFormat.js";

type Mode = "pomodoro" | "shortBreak" | "longBreak";

const modeDisplay: Record<Mode, { label: string }> = {
  pomodoro: { label: "🍅 Pomodoro" },
  shortBreak: { label: "🌻 Short Break" },
  longBreak: { label: "🌳 Long Break" },
};

interface Props {
  getState: () => TimerState;
  updateState: (partial: Partial<TimerState>) => void;
  onQuit: () => void;
  onConfig: () => void;
  onTimeUp: () => void;
}

export function TimerScreen({ getState, updateState, onQuit, onConfig, onTimeUp }: Props) {
  const [seconds, setSeconds] = useState(() => getState().secondsLeft);
  const [isPaused, setIsPaused] = useState(() => getState().isPaused);
  const [mode, setMode] = useState(() => getState().currentMode);
  const [task, setTask] = useState(() => getState().currentTask);

  useEffect(() => {
    const sync = setInterval(() => {
      const s = getState();
      setMode(s.currentMode);
      setTask(s.currentTask);
      if (s.secondsLeft !== seconds) setSeconds(s.secondsLeft);
      if (s.isPaused !== isPaused) setIsPaused(s.isPaused);
    }, 200);
    return () => clearInterval(sync);
  }, [seconds, isPaused]);

  useEffect(() => {
    if (isPaused) return;
    const tick = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1;
        updateState({ secondsLeft: next });
        if (next < 0) { clearInterval(tick); onTimeUp(); }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isPaused]);

  useInput((input, key) => {
    if (input === "p" || input === " ") {
      const next = !isPaused;
      setIsPaused(next);
      updateState({ isPaused: next });
    } else if (input === "q" || (key.ctrl && input === "c")) {
      onQuit();
    } else if (input === "c") {
      onConfig();
    }
  });

  const { label } = modeDisplay[mode as Mode] ?? modeDisplay.pomodoro;
  const timeStr = formatTime(Math.max(0, seconds));

  return (
    <Box flexDirection="column" alignItems="flex-start" marginTop={1} marginLeft={2}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        minWidth={40}
      >
        <Text color="gray">Task: {task}</Text>
        <Text>
          <Text>{label} </Text>
          <Text color="cyan">{timeStr}</Text>
          {isPaused && <Text color="red"> [PAUSED]</Text>}
        </Text>
        <Text> </Text>
        <Text color="gray">[p]ause    [q]uit    [c]onfig</Text>
      </Box>
    </Box>
  );
}
