import { auditExistingVulnerabilities } from "./audit-existing.js";
import { resolvePackageReferences } from "./enrichment/changelog.js";
import { lookupCves } from "./enrichment/cve.js";
import { lookupHackerNews } from "./enrichment/hackernews.js";
import { diffLockfiles } from "./lockfile/diff.js";
async function enrichChange(change, includeHackerNews) {
    const [cves, hackerNews, references] = await Promise.all([
        lookupCves(change.name, change.newVersion),
        includeHackerNews
            ? lookupHackerNews(change.name, change.newVersion)
            : Promise.resolve([]),
        resolvePackageReferences(change.name, change.newVersion),
    ]);
    const securityLevel = cves.length > 0 ? "red" : "yellow";
    return {
        ...change,
        securityLevel,
        cves,
        hackerNews,
        references,
    };
}
export async function analyzeLockfileChanges(oldLockfile, newLockfile, options = {}) {
    const rawChanges = diffLockfiles(oldLockfile, newLockfile, options.projectName);
    const changes = await Promise.all(rawChanges.map((change) => enrichChange(change, options.includeHackerNews ?? false)));
    const redCount = changes.filter((change) => change.securityLevel === "red").length;
    const yellowCount = changes.length - redCount;
    const projectName = options.projectName ??
        newLockfile.packages?.[""]?.name ??
        newLockfile.name ??
        "project";
    let existingVulnerabilities = [];
    if (options.auditExisting) {
        const excludeLockPaths = options.excludeLockPaths ?? new Set(changes.map((change) => change.lockPath));
        existingVulnerabilities = await auditExistingVulnerabilities(newLockfile, {
            projectName,
            excludeLockPaths,
            concurrency: options.auditConcurrency,
        });
    }
    return {
        projectName,
        changes,
        changedCount: changes.length,
        redCount,
        yellowCount,
        existingVulnerabilities,
        existingRedCount: existingVulnerabilities.length,
        auditedExisting: options.auditExisting ?? false,
    };
}
//# sourceMappingURL=analyze.js.map