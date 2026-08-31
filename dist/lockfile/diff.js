import { readFileSync } from "node:fs";
import { parseLockfile } from "./parse.js";
function compareChanges(a, b) {
    if (a.depth !== b.depth) {
        return a.depth - b.depth;
    }
    const pathA = a.breadcrumb.join("/");
    const pathB = b.breadcrumb.join("/");
    return pathA.localeCompare(pathB);
}
export function diffLockfiles(oldLockfile, newLockfile, projectNameOverride) {
    const oldParsed = parseLockfile(oldLockfile, projectNameOverride);
    const newParsed = parseLockfile(newLockfile, projectNameOverride);
    const changes = [];
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
export function readLockfileFromPath(filePath) {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw);
}
export function toUnenrichedChanges(rawChanges) {
    return rawChanges.map((change) => ({
        ...change,
        securityLevel: "yellow",
        cves: [],
        references: { links: [] },
    }));
}
//# sourceMappingURL=diff.js.map