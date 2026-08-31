import { readFileSync } from "node:fs";

import type { PackageChange, PackageLockJson } from "./types.js";
import { parseLockfile } from "./parse.js";

export interface RawPackageChange {
  lockPath: string;
  name: string;
  breadcrumb: string[];
  depth: number;
  oldVersion: string | null;
  newVersion: string;
}

function compareChanges(a: RawPackageChange, b: RawPackageChange): number {
  if (a.depth !== b.depth) {
    return a.depth - b.depth;
  }

  const pathA = a.breadcrumb.join("/");
  const pathB = b.breadcrumb.join("/");
  return pathA.localeCompare(pathB);
}

export function diffLockfiles(
  oldLockfile: PackageLockJson,
  newLockfile: PackageLockJson,
  projectNameOverride?: string,
): RawPackageChange[] {
  const oldParsed = parseLockfile(oldLockfile, projectNameOverride);
  const newParsed = parseLockfile(newLockfile, projectNameOverride);
  const changes: RawPackageChange[] = [];
  const allPaths = new Set([
    ...oldParsed.packages.keys(),
    ...newParsed.packages.keys(),
  ]);

  for (const lockPath of allPaths) {
    const oldPkg = oldParsed.packages.get(lockPath);
    const newPkg = newParsed.packages.get(lockPath);

    if (!newPkg?.version) {
      continue;
    }

    if (oldPkg?.version === newPkg.version) {
      continue;
    }

    changes.push({
      lockPath,
      name: newPkg.name,
      breadcrumb: newPkg.breadcrumb,
      depth: newPkg.depth,
      oldVersion: oldPkg?.version ?? null,
      newVersion: newPkg.version,
    });
  }

  return changes.sort(compareChanges);
}

export function readLockfileFromPath(filePath: string): PackageLockJson {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as PackageLockJson;
}

export function toUnenrichedChanges(rawChanges: RawPackageChange[]): PackageChange[] {
  return rawChanges.map((change) => ({
    ...change,
    securityLevel: "yellow" as const,
    cves: [],
    hackerNews: [],
    references: { links: [] },
  }));
}
