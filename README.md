# 🍅 tomate-cli

A robust Pomodoro timer for the terminal — built with TypeScript and Ink (React for TUI).

![screenshot](./docs/screenshot.png)

______________________________________________________________________

## Features

- **Reactive TUI** — built with [Ink](https://github.com/vadimdemedes/ink) (React component tree rendering to the terminal)
- Pomodoro cycles with short/long breaks, fully configurable
- Keyboard-driven config menu — no prompts, pure arrow-key navigation
- Task labeling: tag sessions with `--task <name>` to track time per project
- Time report grouped by task (`--report`, or `--report-json` pipeable to `jq`)
- Session statistics: total Pomodoros, average durations, break times
- Desktop notifications via `notify-send` (Linux, optional)
- Sound notifications via `ffplay` (optional, graceful fallback if unavailable)
- tmux bell on session end — works headless, no display required
- Persistent config and metrics (JSON files, paths configurable)
- Tested core logic with [Vitest](https://vitest.dev/) (48 tests)

______________________________________________________________________

## Quick Start

### Requirements

- Node.js v18+
- Unix-like shell (Linux, macOS, or WSL2 on Windows)
- `notify-send` (optional, for desktop notifications — `libnotify-bin` on Debian/Ubuntu)
- `ffplay` (optional, for sound — `ffmpeg` package)

### Install

```bash
git clone https://github.com/pfei/tomate-cli.git
cd tomate-cli
npm install
npm run build
```

### Run

```bash
node ./dist/main.js
# or with a task label:
node ./dist/main.js --task myproject
```

To install globally:

```bash
npm install -g .
tomate --task myproject
```

______________________________________________________________________

## Controls

| Key | Action |
|-----|--------|
| `p` or `space` | Pause / Resume |
| `c` | Open config menu |
| `q` | Quit |

______________________________________________________________________

## CLI Reference

```
Usage: tomate [options]

Options:
  --help                    Show help and exit
  --task <name>             Label sessions for time tracking
  --stats                   Show productivity stats
  --report                  Show time report grouped by task
  --report-json             JSON report, pipeable to jq
  --reset-config            Reset config to defaults
  --config-path <path>      Custom config file path
  --metrics-path <path>     Custom metrics file path
  --show-paths              Print config and metrics paths
```

### Examples

```bash
# Start a labeled session
tomate --task myproject

# View stats
tomate --stats

# View task report
tomate --report

# JSON report sorted by time spent
tomate --report-json | jq '
  to_entries
  | sort_by(-.value.totalDecimalHours)
  | map({task: .key, sessions: .value.sessions, duration: .value.totalTimeHours})
'
```

______________________________________________________________________

## Configuration

Config and metrics are stored as JSON in `~/.config/tomate-cli/` by default.

```bash
# Use custom paths
tomate --config-path ~/myconfigs/tomate-config.json \
       --metrics-path ~/myconfigs/tomate-metrics.json

# Persist custom paths across sessions
tomate --set-config-path ~/myconfigs/tomate-config.json
tomate --set-metrics-path ~/myconfigs/tomate-metrics.json
```

Useful for syncing config/metrics with cloud storage or keeping multiple profiles.

______________________________________________________________________

## VPS / Headless usage

tomate-cli works on headless servers (no display required):

- Sound and desktop notifications are automatically skipped when `$DISPLAY` and `$WAYLAND_DISPLAY` are unset
- tmux bell fires on session end — configure tmux to flash the status bar:

```bash
# ~/.tmux.conf
set -g visual-bell on
set -g bell-action any
```

______________________________________________________________________

## Windows

> This project uses Unix shell commands in its build scripts (`rm -rf`, etc.).
> **Windows users must use [WSL2](https://docs.microsoft.com/en-us/windows/wsl/) — native Windows shells are not supported.**

______________________________________________________________________

## Development

```bash
npm test              # run tests (48 tests, Vitest)
npm run coverage      # test coverage
npm run lint          # ESLint
npm run format        # Prettier
npm run build         # compile TypeScript -> dist/
npm run bundle        # build + ncc single-file bundle -> bundle/
```

______________________________________________________________________

## Architecture

```
src/
├── main.ts              # CLI entry point — flag parsing, render(<App>)
├── core/
│   └── state.ts         # shared timer state (closure pattern)
├── ui/
│   ├── App.tsx          # root component — screen routing (timer/config/timeup)
│   ├── TimerScreen.tsx  # countdown, keyboard input, live state sync
│   ├── ConfigScreen.tsx # keyboard-driven config menu (ink-select-input)
│   └── TimeUpScreen.tsx # session-end screen with tmux bell
└── utils/
    ├── config.ts        # load/save config (Zod validation)
    ├── metrics.ts       # session recording and aggregation
    ├── sound.ts         # ffplay wrapper with headless fallback
    └── notifications.ts # notify-send wrapper with headless fallback
```

**State management:** a single `_state` object lives in a closure in `core/state.ts`. Ink components hold local React state (`useState`) for rendering, and sync from `_state` via a polling interval. This keeps the React component tree decoupled from the global timer state.

______________________________________________________________________

## Dependencies

| Package | Purpose |
|---------|---------|
| [ink](https://github.com/vadimdemedes/ink) | React renderer for terminal UI |
| [react](https://react.dev/) | Component model and state management |
| [ink-select-input](https://github.com/vadimdemedes/ink-select-input) | Keyboard-driven select menu |
| [zod](https://github.com/colinhacks/zod) | Config schema validation |
| [chalk](https://github.com/chalk/chalk) | Terminal colors |
| [boxen](https://github.com/sindresorhus/boxen) | Boxed output for stats display |
| [date-fns](https://date-fns.org/) | Date formatting for metrics |

______________________________________________________________________

## Author

Pierre Feilles — [github.com/pfei](https://github.com/pfei)

______________________________________________________________________

## License

MIT
