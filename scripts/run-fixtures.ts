import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeLockfileChanges } from "../src/analyze.js";
import { readLockfileFromPath } from "../src/lockfile/diff.js";
import { writeReport } from "../src/report/write.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(__dirname, "../fixtures/sample-project");
const outputDir = join(fixtureRoot, ".output");

async function main(): Promise<void> {
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
  ) as {
    expectedChanges: Array<{
      name: string;
      oldVersion: string;
      newVersion: string;
      securityLevel: "red" | "yellow";
    }>;
  };

  const result = await analyzeLockfileChanges(oldLockfile, newLockfile, {
    projectName: "sample-project",
    includeHackerNews: false,
  });

  const reportPath = writeReport(result, outputDir);

  console.log(`Report written to ${reportPath}`);
  console.log(
    `Summary: ${result.changedCount} changed, ${result.redCount} red, ${result.yellowCount} yellow`,
  );

  if (result.changedCount !== expected.expectedChanges.length) {
    throw new Error(
      `Expected ${expected.expectedChanges.length} changes, got ${result.changedCount}`,
    );
  }

  for (const expectedChange of expected.expectedChanges) {
    const actual = result.changes.find(
      (change) => change.name === expectedChange.name,
    );

    if (!actual) {
      throw new Error(`Missing expected change for ${expectedChange.name}`);
    }

    if (
      actual.oldVersion !== expectedChange.oldVersion ||
      actual.newVersion !== expectedChange.newVersion
    ) {
      throw new Error(
        `Version mismatch for ${expectedChange.name}: expected ${expectedChange.oldVersion} -> ${expectedChange.newVersion}, got ${actual.oldVersion} -> ${actual.newVersion}`,
      );
    }

    if (actual.securityLevel !== expectedChange.securityLevel) {
      throw new Error(
        `Security level mismatch for ${expectedChange.name}: expected ${expectedChange.securityLevel}, got ${actual.securityLevel}`,
      );
    }
  }

  console.log("Fixture expectations passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
