/**
 * gni — GitNexus code intelligence (14 subcommands)
 * Integrated from miyabi-hub
 */
import type { Command } from "commander";
import chalk from "chalk";
import { runGni, isGniAvailable } from "../utils/gitnexus.js";

function ensureGni(): boolean {
  if (!isGniAvailable()) {
    console.error(chalk.red("✗ gni (GitNexus) is not available. Install with: npm install -g gitnexus"));
    return false;
  }
  return true;
}

function gniPassthrough(subcommand: string, args: string[]): void {
  if (!ensureGni()) {process.exit(1);}
  const result = runGni([subcommand, ...args]);
  if (result.success) {
    console.log(result.output);
  } else {
    console.error(chalk.red(`✗ ${result.output}`));
    process.exit(1);
  }
}

export function registerGniCommand(program: Command): void {
  const gni = program
    .command("gni")
    .description("🧠 GitNexus code intelligence — impact analysis, queries, hotspots");

  gni.command("impact")
    .description("Analyze blast radius of a symbol")
    .argument("<symbol>", "Symbol name to analyze")
    .option("--direction <dir>", "upstream or downstream", "upstream")
    .action((_symbol, _opts) => {
      const symbol = _symbol as string;
      const opts = _opts as { direction?: string };
      gniPassthrough("impact", [symbol, ...(opts.direction ? ["--direction", opts.direction] : [])]);
    });

  gni.command("safe-impact")
    .description("Impact analysis with JSON fallback (no segfault)")
    .argument("<symbol>", "Symbol name")
    .action((_symbol) => gniPassthrough("safe-impact", [_symbol as string]));

  gni.command("query")
    .description("Search code by concept")
    .argument("<search>", "Search query")
    .action((_search) => gniPassthrough("query", [_search as string]));

  gni.command("context")
    .description("360-degree view of a symbol")
    .argument("<symbol>", "Symbol name")
    .action((_symbol) => gniPassthrough("context", [_symbol as string]));

  gni.command("cypher")
    .description("Run raw Cypher query")
    .argument("<query>", "Cypher query string")
    .action((_query) => gniPassthrough("cypher", [_query as string]));

  gni.command("hotspots")
    .description("Top 20 most-depended-on symbols")
    .action(() => gniPassthrough("hotspots", []));

  gni.command("orphans")
    .description("Find orphaned (unreferenced) functions")
    .action(() => gniPassthrough("orphans", []));

  gni.command("clusters")
    .description("List functional clusters")
    .action(() => gniPassthrough("clusters", []));

  gni.command("files")
    .description("List indexed files")
    .action(() => gniPassthrough("files", []));

  gni.command("deps")
    .description("Show dependencies of a symbol")
    .argument("<symbol>", "Symbol name")
    .action((_symbol) => gniPassthrough("deps", [_symbol as string]));

  gni.command("reindex")
    .description("Reindex the repository")
    .option("--embeddings", "Preserve embeddings")
    .action((opts) => gniPassthrough("reindex", opts.embeddings ? ["--embeddings"] : []));

  gni.command("status")
    .description("GitNexus index status")
    .action(() => gniPassthrough("status", []));

  gni.command("doctor")
    .description("GitNexus health diagnostics")
    .action(() => gniPassthrough("doctor", []));

  gni.command("smoke")
    .description("Quick smoke test")
    .action(() => gniPassthrough("smoke", []));
}
