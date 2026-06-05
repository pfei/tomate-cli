import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TimerState } from "../core/state.js";
import { formatTime } from "../utils/timeFormat.js";

type Mode = "pomodoro" | "shortBreak" | "longBreak";

const modeDisplay: Record<Mode, { label: string; color: "red" | "yellow" | "green" }> = {
  pomodoro: { label: "🍅  Pomodoro", color: "red" },
  shortBreak: { label: "🌻  Short Break", color: "yellow" },
  longBreak: { label: "🌳  Long Break", color: "green" },
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

  const { label, color } = modeDisplay[mode as Mode] ?? modeDisplay.pomodoro;
  const col = isPaused ? "red" : color;
  const timeStr = formatTime(Math.max(0, seconds));

  return (
    <Box flexDirection="column" alignItems="center" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={col}
        paddingX={4}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
        minWidth={36}
      >
        <Text color="gray">task: {task}</Text>
        <Text> </Text>
        <Text color={col} bold>{label}</Text>
        <Text> </Text>
        <Text color={col} bold>{timeStr}</Text>
        <Text> </Text>
        {isPaused
          ? <Text color="red" bold>[ PAUSED ]</Text>
          : <Text color="gray" dimColor>running</Text>
        }
        <Text> </Text>
        <Text color="gray" dimColor>[p] pause  [c] config  [q] quit</Text>
      </Box>
    </Box>
  );
}
