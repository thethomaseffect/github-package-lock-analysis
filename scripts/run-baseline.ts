import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  diffLockfiles,
  readLockfileFromPath,
  toUnenrichedChanges,
} from "../src/lockfile/diff.js";
import { writeReport } from "../src/report/write.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "../fixtures/sample-project");
const outputDir = join(fixtureRoot, ".output-baseline");

function main(): void {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  const oldLockfile = readLockfileFromPath(
    join(fixtureRoot, "before/package-lock.json"),
  );
  const newLockfile = readLockfileFromPath(
    join(fixtureRoot, "after/package-lock.json"),
  );
  const expected = JSON.parse(
    readFileSync(join(fixtureRoot, "expected.json"), "utf8"),
  ) as { expectedChanges: unknown[] };

  const rawChanges = diffLockfiles(oldLockfile, newLockfile, "sample-project");
  const changes = toUnenrichedChanges(rawChanges);

  const result = {
    projectName: "sample-project",
    changes,
    changedCount: changes.length,
    redCount: 0,
    yellowCount: changes.length,
    manualReviewCount: 0,
    enrichmentLimited: false,
    enrichmentLimit: 0,
    existingVulnerabilities: [],
    existingRedCount: 0,
    auditedExisting: false,
  };

  const reportPath = writeReport(result, outputDir);

  console.log(`Baseline report written to ${reportPath}`);
  console.log(
    `Summary: ${result.changedCount} changed, ${result.redCount} red, ${result.yellowCount} yellow (diff-only, no CVE lookup)`,
  );

  if (result.changedCount !== expected.expectedChanges.length) {
    throw new Error(
      `Expected ${expected.expectedChanges.length} changes, got ${result.changedCount}`,
    );
  }

  console.log("Baseline fixture expectations passed.");
}

main();
