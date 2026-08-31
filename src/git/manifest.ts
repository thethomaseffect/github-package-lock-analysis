import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import {
  createEmptyManifest,
  parseReportManifest,
  type ReportManifest,
} from "../report-manifest.js";

export function isGitAncestor(
  ancestor: string,
  descendant: string,
  workspace: string,
): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: workspace,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

export function readReportManifest(manifestPath: string): ReportManifest | null {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return parseReportManifest(readFileSync(manifestPath, "utf8"));
  } catch {
    return createEmptyManifest();
  }
}

export function resolveGitSha(ref: string, workspace: string): string | undefined {
  try {
    const sha = execFileSync("git", ["rev-parse", ref], {
      cwd: workspace,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return sha || undefined;
  } catch {
    return undefined;
  }
}
