import * as core from "@actions/core";
import * as github from "@actions/github";

import { buildPullRequestComment } from "./format.js";
import type { AnalysisResult } from "../lockfile/types.js";

const COMMENT_MARKER = "<!-- package-lock-analysis -->";

export async function postPullRequestComment(
  result: AnalysisResult,
  artifactName: string,
  reportUrl?: string,
): Promise<void> {
  if (github.context.eventName !== "pull_request") {
    core.info("Skipping PR comment — not a pull_request event.");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning("GITHUB_TOKEN not available; skipping PR comment.");
    return;
  }

  const pullRequest = github.context.payload.pull_request as
    | { number: number }
    | undefined;

  if (!pullRequest?.number) {
    core.warning("Pull request number unavailable; skipping PR comment.");
    return;
  }

  const octokit = github.getOctokit(token);
  const body = `${COMMENT_MARKER}\n${buildPullRequestComment(result, artifactName, reportUrl)}`;
  const { owner, repo } = github.context.repo;

  const existing = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullRequest.number,
  });

  const previous = existing.data.find((comment) =>
    comment.body?.includes(COMMENT_MARKER),
  );

  if (previous) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: previous.id,
      body,
    });
    core.info("Updated existing pull request comment.");
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullRequest.number,
    body,
  });
  core.info("Posted pull request comment.");
}
