import { describe, expect, it } from "vitest";

import {
  analyzeLockfileChanges,
  DEFAULT_ENRICHMENT_LIMIT,
} from "../src/analyze.js";
import { buildMinimalPackageReferences } from "../src/enrichment/minimal-references.js";
import {
  buildPullRequestComment,
  buildSummaryChangeList,
  formatChangeLine,
} from "../src/github/format.js";
import { diffLockfiles, type RawPackageChange } from "../src/lockfile/diff.js";
import type { PackageLockJson } from "../src/lockfile/types.js";
import { MANUAL_REVIEW_TOOLTIP } from "../src/manual-review.js";
import { buildReportHtml } from "../src/report/build.js";

function makeLockfile(
  packages: PackageLockJson["packages"],
): PackageLockJson {
  return { lockfileVersion: 3, packages };
}

function buildSyntheticChanges(count: number): RawPackageChange[] {
  return Array.from({ length: count }, (_, index) => ({
    lockPath: `node_modules/pkg-${index}`,
    name: `pkg-${index}`,
    breadcrumb: ["project", `pkg-${index}`],
    depth: 1,
    oldVersion: "1.0.0",
    newVersion: "2.0.0",
  }));
}

describe("analyzeLockfileChanges enrichment limit", () => {
  it("marks all changes manual-review when above enrichment limit", async () => {
    const oldLockfile = makeLockfile({ "": { name: "project", version: "1.0.0" } });
    const newLockfile = makeLockfile({ "": { name: "project", version: "1.0.0" } });

    for (let index = 0; index < 3; index += 1) {
      const path = `node_modules/pkg-${index}`;
      oldLockfile.packages![path] = {
        name: `pkg-${index}`,
        version: "1.0.0",
      };
      newLockfile.packages![path] = {
        name: `pkg-${index}`,
        version: "2.0.0",
      };
    }

    const result = await analyzeLockfileChanges(oldLockfile, newLockfile, {
      projectName: "project",
      enrichmentLimit: 2,
    });

    expect(result.enrichmentLimited).toBe(true);
    expect(result.enrichmentLimit).toBe(2);
    expect(result.changedCount).toBe(3);
    expect(result.manualReviewCount).toBe(3);
    expect(result.redCount).toBe(0);
    expect(result.changes.every((change) => change.manualReview)).toBe(true);
    expect(
      result.changes.every(
        (change) => change.references.links.length === 1 && change.cves.length === 0,
      ),
    ).toBe(true);
  });

  it("uses default enrichment limit constant", () => {
    expect(DEFAULT_ENRICHMENT_LIMIT).toBeGreaterThan(0);
  });
});

describe("manual review presentation", () => {
  it("formats manual-review rows with a question mark", () => {
    const line = formatChangeLine({
      lockPath: "node_modules/lodash",
      name: "lodash",
      breadcrumb: ["app", "lodash"],
      depth: 1,
      oldVersion: "4.17.21",
      newVersion: "4.17.15",
      securityLevel: "yellow",
      manualReview: true,
      cves: [],
      hackerNews: [],
      references: buildMinimalPackageReferences("lodash", "4.17.15"),
    });

    expect(line.startsWith("❓")).toBe(true);
  });

  it("includes manual-review notice in PR comments and truncates long lists", () => {
    const changes = buildSyntheticChanges(5).map((change) => ({
      ...change,
      securityLevel: "yellow" as const,
      manualReview: true,
      cves: [],
      hackerNews: [],
      references: buildMinimalPackageReferences(change.name, change.newVersion),
    }));

    const comment = buildPullRequestComment(
      {
        projectName: "project",
        changes,
        changedCount: 5,
        redCount: 0,
        yellowCount: 5,
        manualReviewCount: 5,
        enrichmentLimited: true,
        enrichmentLimit: 2,
        existingVulnerabilities: [],
        existingRedCount: 0,
        auditedExisting: false,
      },
      "lockfile-report",
      undefined,
      2,
    );

    expect(comment).toContain("CVE and changelog lookups were skipped");
    expect(comment).toContain("Showing 2 of 5 changes");
    expect(buildSummaryChangeList(
      {
        projectName: "project",
        changes,
        changedCount: 5,
        redCount: 0,
        yellowCount: 5,
        manualReviewCount: 5,
        enrichmentLimited: true,
        enrichmentLimit: 2,
        existingVulnerabilities: [],
        existingRedCount: 0,
        auditedExisting: false,
      },
      2,
    )).toHaveLength(3);
  });

  it("renders manual-review tooltip text in HTML report", () => {
    const html = buildReportHtml({
      projectName: "project",
      changedCount: 1,
      redCount: 0,
      yellowCount: 1,
      manualReviewCount: 1,
      enrichmentLimited: true,
      enrichmentLimit: 1,
      existingVulnerabilities: [],
      existingRedCount: 0,
      auditedExisting: false,
      changes: [
        {
          lockPath: "node_modules/lodash",
          name: "lodash",
          breadcrumb: ["app", "lodash"],
          depth: 1,
          oldVersion: "1.0.0",
          newVersion: "2.0.0",
          securityLevel: "yellow",
          manualReview: true,
          cves: [],
          hackerNews: [],
          references: buildMinimalPackageReferences("lodash", "2.0.0"),
        },
      ],
    });

    expect(html).toContain(MANUAL_REVIEW_TOOLTIP);
    expect(html).toContain("❓ Manual review");
    expect(html).toContain("CVE and changelog lookups were skipped");
  });
});

describe("diffLockfiles baseline", () => {
  it("still diffs large synthetic lockfiles without enrichment", () => {
    const oldLockfile = makeLockfile({ "": { name: "project", version: "1.0.0" } });
    const newLockfile = makeLockfile({ "": { name: "project", version: "1.0.0" } });

    for (let index = 0; index < 50; index += 1) {
      const path = `node_modules/pkg-${index}`;
      oldLockfile.packages![path] = { name: `pkg-${index}`, version: "1.0.0" };
      newLockfile.packages![path] = { name: `pkg-${index}`, version: "2.0.0" };
    }

    const changes = diffLockfiles(oldLockfile, newLockfile, "project");
    expect(changes).toHaveLength(50);
  });
});
