import { resolveChangelogLink } from "./enrichment/changelog.js";
import { lookupCves } from "./enrichment/cve.js";
import { lookupHackerNews } from "./enrichment/hackernews.js";
import { diffLockfiles } from "./lockfile/diff.js";
async function enrichChange(change, includeHackerNews) {
    const [cves, hackerNews, changelog] = await Promise.all([
        lookupCves(change.name, change.newVersion),
        includeHackerNews
            ? lookupHackerNews(change.name, change.newVersion)
            : Promise.resolve([]),
        resolveChangelogLink(change.name),
    ]);
    const securityLevel = cves.length > 0 ? "red" : "yellow";
    return {
        ...change,
        securityLevel,
        cves,
        hackerNews,
        changelog,
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
    return {
        projectName,
        changes,
        changedCount: changes.length,
        redCount,
        yellowCount,
    };
}
//# sourceMappingURL=analyze.js.map