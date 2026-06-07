import { useEffect } from "react";
import { Box, Text } from "ink";

interface Props {
  mode: string;
  onDone: () => void;
}

const messages: Record<string, { title: string; sub: string }> = {
  pomodoro: { title: "🍅 Pomodoro done!", sub: "Time for a break." },
  shortBreak: { title: "🌻 Short break over!", sub: "Back to work." },
  longBreak: { title: "🌳 Long break over!", sub: "Ready to focus again?" },
};

export function TimeUpScreen({ mode, onDone }: Props) {
  useEffect(() => {
    // tmux bell — makes the tmux window/bar flash
    process.stdout.write("\x07");

    const timer = setTimeout(() => {
      onDone();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const { title, sub } = messages[mode] ?? { title: "Time's up!", sub: "" };

  return (
    <Box flexDirection="column" alignItems="flex-start" marginTop={1} marginLeft={2}>
      <Box
        borderStyle="double"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        minWidth={40}
      >
        <Text color="yellow" bold>{title}</Text>
        <Text> </Text>
        <Text color="gray">{sub}</Text>
        <Text> </Text>
        <Text color="gray" dimColor>starting next session in 3s...</Text>
      </Box>
    </Box>
  );
}
