import { describe, expect, it, vi } from "vitest";

import { auditExistingVulnerabilities } from "../src/audit-existing.js";
import { lookupCves } from "../src/enrichment/cve.js";
import { resolvePackageReferences } from "../src/enrichment/changelog.js";
import type { PackageLockJson } from "../src/lockfile/types.js";

vi.mock("../src/enrichment/cve.js", () => ({
  lookupCves: vi.fn(),
}));

vi.mock("../src/enrichment/changelog.js", () => ({
  resolvePackageReferences: vi.fn(),
}));

describe("auditExistingVulnerabilities", () => {
  it("returns installed packages with CVEs that are excluded from the diff set", async () => {
    vi.mocked(lookupCves).mockImplementation(async (name) => {
      if (name === "safe-lib") {
        return [{ id: "CVE-9999-0001", url: "https://nvd.nist.gov/vuln/detail/CVE-9999-0001" }];
      }

      return [];
    });
    vi.mocked(resolvePackageReferences).mockResolvedValue({
      links: [{ url: "https://example.com", label: "npm @ 1.0.0", kind: "npm-version" }],
    });

    const lockfile: PackageLockJson = {
      name: "sample-project",
      packages: {
        "": { name: "sample-project", version: "1.0.0" },
        "node_modules/safe-lib": { name: "safe-lib", version: "1.0.0" },
        "node_modules/changed-lib": { name: "changed-lib", version: "2.0.0" },
      },
    };

    const results = await auditExistingVulnerabilities(lockfile, {
      projectName: "sample-project",
      excludeLockPaths: new Set(["node_modules/changed-lib"]),
      concurrency: 2,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("safe-lib");
    expect(results[0]?.cves[0]?.id).toBe("CVE-9999-0001");
  });
});
