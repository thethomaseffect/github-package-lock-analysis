import { describe, expect, it } from "vitest";

import {
  resolveBaseRefFromContext,
  resolveHeadRefFromContext,
} from "../src/git/resolve-lockfiles.js";
import {
  buildPullRequestComment,
  buildWorkflowArtifactSummaryHtml,
  formatChangeLine,
} from "../src/github/format.js";
import type { AnalysisResult } from "../src/lockfile/types.js";

describe("resolveBaseRefFromContext", () => {
  it("prefers explicit override", () => {
    expect(
      resolveBaseRefFromContext(
        { eventName: "push", sha: "abc", payload: {} },
        "custom-base",
      ),
    ).toBe("custom-base");
  });

  it("reads pull request base sha", () => {
    expect(
      resolveBaseRefFromContext({
        eventName: "pull_request",
        sha: "merge-sha",
        payload: { pull_request: { base: { sha: "base-sha" } } },
      }),
    ).toBe("base-sha");
  });

  it("reads push before sha", () => {
    expect(
      resolveBaseRefFromContext({
        eventName: "push",
        sha: "head-sha",
        payload: { before: "before-sha" },
      }),
    ).toBe("before-sha");
  });

  it("falls back to HEAD~1 on push without before", () => {
    expect(
      resolveBaseRefFromContext({
        eventName: "push",
        sha: "head-sha",
        payload: { before: "0000000000000000000000000000000000000000" },
      }),
    ).toBe("HEAD~1");
  });
});

describe("resolveHeadRefFromContext", () => {
  it("reads pull request head sha", () => {
    expect(
      resolveHeadRefFromContext({
        eventName: "pull_request",
        sha: "merge-sha",
        payload: { pull_request: { head: { sha: "head-sha" } } },
      }),
    ).toBe("head-sha");
  });
});

describe("buildPullRequestComment", () => {
  it("lists changed packages with security markers", () => {
    const result: AnalysisResult = {
      projectName: "sample-project",
      changedCount: 2,
      redCount: 1,
      yellowCount: 1,
      manualReviewCount: 0,
      enrichmentLimited: false,
      enrichmentLimit: 500,
      existingVulnerabilities: [],
      existingRedCount: 0,
      auditedExisting: false,
      changes: [
        {
          lockPath: "node_modules/lodash",
          name: "lodash",
          breadcrumb: ["sample-project", "lodash"],
          depth: 1,
          oldVersion: "4.17.21",
          newVersion: "4.17.15",
          securityLevel: "red",
          cves: [
            {
              id: "CVE-2020-8203",
              url: "https://nvd.nist.gov/vuln/detail/CVE-2020-8203",
            },
          ],
          hackerNews: [],
          references: {
            links: [
              {
                url: "https://www.npmjs.com/package/lodash/v/4.17.15",
                label: "npm @ 4.17.15",
                kind: "npm-version",
              },
            ],
          },
        },
        {
          lockPath: "node_modules/accepts/node_modules/negotiator",
          name: "negotiator",
          breadcrumb: ["sample-project", "accepts", "negotiator"],
          depth: 2,
          oldVersion: "0.6.3",
          newVersion: "0.6.2",
          securityLevel: "yellow",
          cves: [],
          hackerNews: [],
          references: {
            links: [
              {
                url: "https://www.npmjs.com/package/negotiator/v/0.6.2",
                label: "npm @ 0.6.2",
                kind: "npm-version",
              },
            ],
          },
        },
      ],
    };

    const comment = buildPullRequestComment(result, "lockfile-report");

    expect(comment).toContain("CVE-2020-8203");
    expect(comment).toContain("sample-project > lodash");
    expect(comment).toContain("sample-project > accepts > negotiator");
    expect(comment).toContain("lockfile-report");
    expect(formatChangeLine(result.changes[0]!)).toContain("🔴");

    const withUrl = buildPullRequestComment(result, "lockfile-report", "https://example.com/report");
    expect(withUrl).toContain("[View HTML report](https://example.com/report)");
    expect(withUrl).not.toContain("workflow artifacts");
  });

  it("builds clickable HTML links for the job summary report section", () => {
    const html = buildWorkflowArtifactSummaryHtml(
      "lockfile-report",
      "https://github.com/org/repo/actions/runs/123",
      "https://example.github.io/repo/reports/123/",
    );

    expect(html).toContain('<a href="https://example.github.io/repo/reports/123/">View HTML report</a>');
    expect(html).toContain('<a href="https://github.com/org/repo/actions/runs/123">workflow run</a>');
    expect(html).toContain("<code>lockfile-report</code>");
    expect(html).not.toContain("[View HTML report]");
  });
});
