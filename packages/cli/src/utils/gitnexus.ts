/**
 * gitnexus — GitNexus shell bridge for code intelligence
 * Uses `npx gitnexus` for portable cross-platform execution.
 */
import { execSync } from "node:child_process";

export interface GniResult {
  success: boolean;
  output: string;
  command: string;
}

/** Run a GNI subcommand via npx gitnexus */
export function runGni(args: string[]): GniResult {
  const command = `npx gitnexus ${args.join(" ")}`;

  try {
    const output = execSync(command, {
      encoding: "utf-8",
      cwd: process.cwd(),
      timeout: 60_000,
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return { success: true, output, command };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Try to extract stderr or stdout from the exec error
    const execErr = err as { stderr?: string; stdout?: string };
    const detail = execErr.stdout?.trim() || execErr.stderr?.trim() || message;
    return {
      success: false,
      output: detail,
      command,
    };
  }
}

/** Check if GitNexus is available via npx */
export function isGniAvailable(): boolean {
  try {
    execSync("npx gitnexus --version", {
      encoding: "utf-8",
      timeout: 15_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}
