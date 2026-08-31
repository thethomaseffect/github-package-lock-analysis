import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import * as github from "@actions/github";

import { isGitAncestor, readReportManifest } from "./manifest.js";
import { resolveManifestBaseRef } from "../report-manifest.js";

export interface ResolveLockfilesOptions {
  lockfilePath: string;
  oldLockfilePath?: string;
  newLockfilePath?: string;
  baseRef?: string;
  headRef?: string;
  workspace: string;
  tempDir: string;
  reportManifestPath?: string;
  useReportManifestBase?: boolean;
}

export interface ResolvedLockfiles {
  oldPath: string;
  newPath: string;
  cleanup: () => void;
  source: "explicit" | "git";
  baseRef?: string;
  headRef?: string;
}

export interface GitEventContext {
  eventName: string;
  sha: string;
  payload: unknown;
}

export function resolveBaseRefFromContext(
  context: GitEventContext,
  override?: string,
): string | null {
  if (override?.trim()) {
    return override.trim();
  }

  if (context.eventName === "pull_request") {
    const pullRequest = (context.payload as { pull_request?: { base?: { sha?: string } } })
      .pull_request;
    return pullRequest?.base?.sha ?? null;
  }

  if (context.eventName === "push") {
    const before = (context.payload as { before?: string }).before;
    if (before && before !== "0000000000000000000000000000000000000000") {
      return before;
    }
    return "HEAD~1";
  }

  return null;
}

export function resolveHeadRefFromContext(context: GitEventContext, override?: string): string {
  if (override?.trim()) {
    return override.trim();
  }

  if (context.eventName === "pull_request") {
    const pullRequest = (context.payload as { pull_request?: { head?: { sha?: string } } })
      .pull_request;
    return pullRequest?.head?.sha ?? context.sha;
  }

  return context.sha;
}

export function resolveBaseRefWithManifest(
  context: GitEventContext,
  headRef: string,
  workspace: string,
  override?: string,
  reportManifestPath?: string,
  useReportManifestBase?: boolean,
): string | null {
  if (override?.trim()) {
    return override.trim();
  }

  if (useReportManifestBase && reportManifestPath) {
    const manifest = readReportManifest(reportManifestPath);
    const manifestBase = resolveManifestBaseRef(manifest, headRef, (ancestor, descendant) =>
      isGitAncestor(ancestor, descendant, workspace),
    );

    if (manifestBase) {
      return manifestBase;
    }
  }

  return resolveBaseRefFromContext(context);
}

export function gitShow(
  ref: string,
  filePath: string,
  workspace: string,
): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${filePath}`], {
      cwd: workspace,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

export function lockfileChangedInGit(
  baseRef: string,
  headRef: string,
  lockfilePath: string,
  workspace: string,
): boolean {
  try {
    execFileSync("git", ["diff", "--quiet", baseRef, headRef, "--", lockfilePath], {
      cwd: workspace,
      stdio: "pipe",
    });
    return false;
  } catch {
    return true;
  }
}

export function resolveLockfiles(options: ResolveLockfilesOptions): ResolvedLockfiles {
  const workspace = options.workspace;
  const lockfilePath = options.lockfilePath;

  if (options.oldLockfilePath && options.newLockfilePath) {
    return {
      oldPath: options.oldLockfilePath,
      newPath: options.newLockfilePath,
      cleanup: () => {},
      source: "explicit",
    };
  }

  const context = github.context as GitEventContext;
  const headRef = resolveHeadRefFromContext(context, options.headRef);
  const baseRef = resolveBaseRefWithManifest(
    context,
    headRef,
    workspace,
    options.baseRef,
    options.reportManifestPath,
    options.useReportManifestBase,
  );

  if (!baseRef) {
    throw new Error(
      "Could not determine base ref. Provide old-lockfile-path or base-ref, or run on pull_request/push events.",
    );
  }

  mkdirSync(options.tempDir, { recursive: true });
  const oldTempPath = join(options.tempDir, "base-package-lock.json");

  const oldContent = gitShow(baseRef, lockfilePath, workspace);
  if (oldContent === null) {
    throw new Error(
      `Could not read ${lockfilePath} at ref ${baseRef}. Use actions/checkout with fetch-depth: 0.`,
    );
  }

  writeFileSync(oldTempPath, oldContent, "utf8");

  const newPath = options.newLockfilePath ?? join(workspace, lockfilePath);
  if (!existsSync(newPath)) {
    const headContent = gitShow(headRef, lockfilePath, workspace);
    if (headContent === null) {
      throw new Error(`Lockfile not found at ${newPath} or ref ${headRef}.`);
    }

    const newTempPath = join(options.tempDir, "head-package-lock.json");
    writeFileSync(newTempPath, headContent, "utf8");

    return {
      oldPath: oldTempPath,
      newPath: newTempPath,
      cleanup: () => rmSync(options.tempDir, { recursive: true, force: true }),
      source: "git",
      baseRef,
      headRef,
    };
  }

  return {
    oldPath: oldTempPath,
    newPath,
    cleanup: () => rmSync(options.tempDir, { recursive: true, force: true }),
    source: "git",
    baseRef,
    headRef,
  };
}

export function shouldSkipUnchangedLockfile(
  skipIfUnchanged: boolean,
  resolved: ResolvedLockfiles,
  lockfilePath: string,
  workspace: string,
): boolean {
  if (!skipIfUnchanged || resolved.source !== "git" || !resolved.baseRef || !resolved.headRef) {
    return false;
  }

  if (resolved.baseRef === resolved.headRef) {
    return false;
  }

  return !lockfileChangedInGit(resolved.baseRef, resolved.headRef, lockfilePath, workspace);
}
