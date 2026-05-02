import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { Metrics, Session } from "../src/utils/metrics.js";

const DEFAULT_METRICS_PATH = path.join(os.homedir(), ".config/tomate-cli/metrics.json");

interface TaskStats {
  sessions: number;
  totalTimeMs: number;
  totalDecimalHours: number;
  totalTimeHours: string;
}

function showHelp() {
  console.log(`
Usage: npx tsx scripts/tasks-report.ts [options]

Options:
  --help                Show this help message
  --metrics-path <p>    Use a custom metrics file path (default: ~/.config/tomate-cli/metrics.json)

Example:
  npx tsx scripts/tasks-report.ts --metrics-path ./my-data.json
  `);
}

function getMetricsPath(): string | undefined {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return undefined;
  }

  const pathIndex = args.indexOf("--metrics-path");
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    return path.resolve(args[pathIndex + 1]);
  }

  return DEFAULT_METRICS_PATH;
}

function generateReport() {
  const metricsPath = getMetricsPath();

  // Si l'aide a été affichée, on quitte proprement
  if (metricsPath === undefined) return;

  if (!fs.existsSync(metricsPath)) {
    console.error(`❌ Metrics file not found at: ${metricsPath}`);
    process.exit(1);
  }

  const data = fs.readFileSync(metricsPath, "utf-8");
  const metrics: Metrics = JSON.parse(data);
  const sessions: Session[] = metrics.sessions;

  const report = sessions
    .filter((s) => s.type === "pomodoro")
    .reduce(
      (acc, s) => {
        const task = s.task || "generic";
        const durationMs = new Date(s.end).getTime() - new Date(s.start).getTime();

        if (!acc[task]) {
          acc[task] = {
            sessions: 0,
            totalTimeMs: 0,
            totalDecimalHours: 0,
            totalTimeHours: "",
          };
        }

        acc[task].sessions += 1;
        acc[task].totalTimeMs += durationMs;
        acc[task].totalDecimalHours = parseFloat((acc[task].totalTimeMs / 3600000).toFixed(2));

        const totalSeconds = Math.floor(acc[task].totalTimeMs / 1000);
        const h = Math.floor(totalSeconds / 3600)
          .toString()
          .padStart(2, "0");
        const m = Math.floor((totalSeconds % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const s_ = (totalSeconds % 60).toString().padStart(2, "0");
        acc[task].totalTimeHours = `${h}:${m}:${s_}`;

        return acc;
      },
      {} as Record<string, TaskStats>,
    );

  console.log(JSON.stringify(report, null, 2));
}

generateReport();
