import { lookupCves } from "./enrichment/cve.js";
import { lookupHackerNews } from "./enrichment/hackernews.js";
import { buildChangelogUrl } from "./enrichment/urls.js";
import { diffLockfiles } from "./lockfile/diff.js";
async function enrichChange(change, includeHackerNews) {
    const cves = await lookupCves(change.name, change.newVersion);
    const hackerNews = includeHackerNews
        ? await lookupHackerNews(change.name, change.newVersion)
        : [];
    const securityLevel = cves.length > 0 ? "red" : "yellow";
    return {
        ...change,
        securityLevel,
        cves,
        hackerNews,
        changelogUrl: buildChangelogUrl(change.name),
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