import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { loadConfig, saveConfig, NumericConfigKey } from "../utils/config.js";
import { formatTime } from "../utils/timeFormat.js";
import { TimerState } from "../core/state.js";

type Screen = "menu" | "editing";

interface MenuItem {
  label: string;
  value: NumericConfigKey | "back";
}

interface Props {
  configPath: string;
  getState: () => TimerState;
  updateState: (partial: Partial<TimerState>) => void;
  onBack: () => void;
}

export function ConfigScreen({ configPath, getState, updateState, onBack }: Props) {
  const config = loadConfig(configPath);
  const [screen, setScreen] = useState<Screen>("menu");
  const [editing, setEditing] = useState<NumericConfigKey | null>(null);
  const [inputBuf, setInputBuf] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const menuItems: MenuItem[] = [
    { label: `🍅 Pomodoro      ${formatTime(config.pomodoro)}`, value: "pomodoro" },
    { label: `🌻 Short Break   ${formatTime(config.shortBreak)}`, value: "shortBreak" },
    { label: `🌳 Long Break    ${formatTime(config.longBreak)}`, value: "longBreak" },
    { label: `← Back to timer`, value: "back" },
  ];

  function handleMenuSelect(item: MenuItem) {
    if (item.value === "back") { onBack(); return; }
    setEditing(item.value as NumericConfigKey);
    setInputBuf("");
    setFeedback(null);
    setScreen("editing");
  }

  function commitEdit() {
    if (!editing) return;
    const secs = parseInt(inputBuf, 10);
    if (!isNaN(secs) && secs > 0) {
      config[editing] = secs;
      saveConfig(config, configPath);
      if (editing === "pomodoro") updateState({ secondsLeft: secs });
      setFeedback({ msg: `✅ Saved ${formatTime(secs)}`, ok: true });
    } else {
      setFeedback({ msg: "❌ Must be a positive number (seconds)", ok: false });
    }
    setScreen("menu");
    setEditing(null);
    setInputBuf("");
  }

  useInput((input, key) => {
    if (screen !== "editing") return;
    if (key.escape) { setScreen("menu"); setEditing(null); setInputBuf(""); return; }
    if (key.return) { commitEdit(); return; }
    if (key.backspace || key.delete) { setInputBuf((b) => b.slice(0, -1)); return; }
    if (/^\d$/.test(input)) setInputBuf((b) => b + input);
  });

  const editingLabel = editing
    ? { pomodoro: "🍅 Pomodoro", shortBreak: "🌻 Short Break", longBreak: "🌳 Long Break" }[editing]
    : "";

  return (
    <Box flexDirection="column" alignItems="flex-start" marginTop={1} marginLeft={2}>
      <Box
        borderStyle="round"
        borderColor="green"
        paddingX={4}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
        minWidth={46}
      >
        <Text color="green" bold>Configure Pomodoro Timers</Text>
        <Text> </Text>

        {screen === "menu" && (
          <>
            {feedback && (
              <>
                <Text color={feedback.ok ? "green" : "red"}>{feedback.msg}</Text>
                <Text> </Text>
              </>
            )}
            <SelectInput items={menuItems} onSelect={handleMenuSelect} />
            <Text> </Text>
            <Text color="gray" dimColor>↑↓ navigate   enter select</Text>
          </>
        )}

        {screen === "editing" && (
          <>
            <Text color="yellow">Set {editingLabel} duration</Text>
            <Text color="gray" dimColor>(enter seconds, e.g. 1500 = 25 min)</Text>
            <Text> </Text>
            <Box>
              <Text color="cyan">▶ </Text>
              <Text color="white">{inputBuf || " "}</Text>
              <Text color="cyan" bold>█</Text>
            </Box>
            <Text> </Text>
            <Text color="gray" dimColor>enter confirm   esc cancel</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
