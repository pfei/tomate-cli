import chalk from "chalk";

export function displayError(context: string, error: unknown): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

  console.error(chalk.red(`⛔ ${context}:`), message);
}

export function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error(typeof error === "string" ? error : "Unknown error");
}
