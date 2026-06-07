import { useEffect, useState } from "react";
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
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState(() => getState().currentMode);
  const [task, setTask] = useState(() => getState().currentTask);

  // Sync loop — pulls external state changes (cycle advance, config update)
  useEffect(() => {
    const sync = setInterval(() => {
      const s = getState();
      if (s.currentMode !== mode) setMode(s.currentMode);
      if (s.currentTask !== task) setTask(s.currentTask);
      if (s.secondsLeft !== seconds) setSeconds(s.secondsLeft);
    }, 200);
    return () => clearInterval(sync);
  }, [mode, task, seconds]);

  // Countdown tick
  useEffect(() => {
    if (isPaused) return;
    const tick = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1;
        updateState({ secondsLeft: next });
        if (next < 0) {
          clearInterval(tick);
          setTimeout(() => onTimeUp(), 0);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [isPaused, mode]); // mode change restarts the countdown

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
