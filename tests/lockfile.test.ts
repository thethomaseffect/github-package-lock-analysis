import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { formatBreadcrumb, parseLockfile } from "../src/lockfile/parse.js";
import { diffLockfiles } from "../src/lockfile/diff.js";
import { buildReportHtml } from "../src/report/build.js";
import type { AnalysisResult } from "../src/lockfile/types.js";

const fixtureRoot = join(process.cwd(), "fixtures/sample-project");

describe("parseLockfile", () => {
  it("builds breadcrumb paths from nested lockfile keys", () => {
    const lockfile = JSON.parse(
      readFileSync(join(fixtureRoot, "after/package-lock.json"), "utf8"),
    );

    const parsed = parseLockfile(lockfile, "sample-project");
    const negotiator = parsed.packages.get(
      "node_modules/accepts/node_modules/negotiator",
    );
    const lodash = parsed.packages.get("node_modules/cheerio/node_modules/lodash");

    expect(negotiator?.breadcrumb).toEqual([
      "sample-project",
      "accepts",
      "negotiator",
    ]);
    expect(formatBreadcrumb(negotiator!.breadcrumb)).toBe(
      "sample-project > accepts > negotiator",
    );
    expect(lodash?.breadcrumb).toEqual(["sample-project", "cheerio", "lodash"]);
    expect(formatBreadcrumb(lodash!.breadcrumb)).toBe(
      "sample-project > cheerio > lodash",
    );
  });
});

describe("diffLockfiles", () => {
  it("returns only packages whose versions changed, shallow paths first", () => {
    const before = JSON.parse(
      readFileSync(join(fixtureRoot, "before/package-lock.json"), "utf8"),
    );
    const after = JSON.parse(
      readFileSync(join(fixtureRoot, "after/package-lock.json"), "utf8"),
    );

    const changes = diffLockfiles(before, after, "sample-project");

    expect(changes).toHaveLength(2);
    expect(changes[0]?.name).toBe("negotiator");
    expect(changes[0]?.depth).toBe(2);
    expect(changes[1]?.name).toBe("lodash");
    expect(changes[1]?.depth).toBe(2);
    expect(changes[1]?.breadcrumb).toEqual(["sample-project", "cheerio", "lodash"]);
  });
});

describe("buildReportHtml", () => {
  it("renders updated packages with security badges", () => {
    const result: AnalysisResult = {
      projectName: "sample-project",
      changedCount: 1,
      redCount: 1,
      yellowCount: 0,
      changes: [
        {
          lockPath: "node_modules/cheerio/node_modules/lodash",
          name: "lodash",
          breadcrumb: ["sample-project", "cheerio", "lodash"],
          depth: 2,
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
      ],
    };

    const html = buildReportHtml(result);

    expect(html).toContain("sample-project &gt; cheerio &gt; lodash");
    expect(html).toContain("Known CVE");
    expect(html).toContain("CVE-2020-8203");
  });
});
