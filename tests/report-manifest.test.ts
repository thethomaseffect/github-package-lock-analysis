import { describe, expect, it } from "vitest";

import {
  buildContentsIndexHtml,
  buildReportPageUrl,
  resolveManifestBaseRef,
  upsertReportEntry,
} from "../src/report-manifest.js";

const sampleEntry = (overrides: Partial<Parameters<typeof upsertReportEntry>[1]> = {}) => ({
  runId: "run-1",
  commit: "abc123",
  commitTitle: "Update lockfile",
  changedCount: 2,
  issueCount: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  url: "https://example.github.io/repo/reports/run-1/",
  ...overrides,
});

describe("report manifest", () => {
  it("builds run-scoped report URLs", () => {
    expect(buildReportPageUrl("https://example.github.io/repo", "12345678")).toBe(
      "https://example.github.io/repo/reports/12345678/",
    );
  });

  it("uses the latest report commit as the diff base when it is an ancestor", () => {
    const base = resolveManifestBaseRef(
      {
        latestReportCommit: "commit-a",
        reports: [],
      },
      "commit-j",
      (ancestor, descendant) => ancestor === "commit-a" && descendant === "commit-j",
    );

    expect(base).toBe("commit-a");
  });

  it("retains reports from different runs and overwrites the same run id", () => {
    const manifest = upsertReportEntry(
      {
        latestReportCommit: "older",
        reports: [sampleEntry({ runId: "run-old", commit: "older" })],
      },
      sampleEntry({ runId: "run-new", commit: "newer" }),
    );

    expect(manifest.latestReportCommit).toBe("newer");
    expect(manifest.reports).toHaveLength(2);

    const replaced = upsertReportEntry(manifest, sampleEntry({
      runId: "run-new",
      commit: "newer",
      generatedAt: "2026-02-02T00:00:00.000Z",
    }));

    expect(replaced.reports).toHaveLength(2);
    expect(replaced.reports[0]?.generatedAt).toBe("2026-02-02T00:00:00.000Z");
  });

  it("returns the same commit for re-runs so the diff is empty but the report can be republished", () => {
    const base = resolveManifestBaseRef(
      {
        latestReportCommit: "commit-j",
        reports: [],
      },
      "commit-j",
      () => true,
    );

    expect(base).toBe("commit-j");
  });

  it("renders a contents table with commit, run, and counts", () => {
    const html = buildContentsIndexHtml({
      latestReportCommit: "abc123",
      reports: [
        sampleEntry({
          runId: "999",
          commitTitle: "Fix lodash",
          changedCount: 3,
          issueCount: 1,
          workflowRunUrl: "https://github.com/org/repo/actions/runs/999",
        }),
      ],
    }, "https://github.com/org/repo");

    expect(html).toContain("Fix lodash");
    expect(html).toContain("999");
    expect(html).toContain("3");
    expect(html).toContain("1");
    expect(html).toContain("./reports/999/");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('class="external-link"');
    expect(html).toContain('class="external-icon"');
    expect(html).toContain("https://github.com/org/repo/commit/abc123");
    expect(html).toContain("https://github.com/org/repo/actions/runs/999");
  });
});
