import { mapWithConcurrency } from "./concurrency.js";
import { resolvePackageReferences } from "./enrichment/changelog.js";
import { lookupCves } from "./enrichment/cve.js";
import { parseLockfile } from "./lockfile/parse.js";
function compareExisting(a, b) {
    if (a.depth !== b.depth) {
        return a.depth - b.depth;
    }
    return a.breadcrumb.join("/").localeCompare(b.breadcrumb.join("/"));
}
async function enrichExistingPackage(pkg) {
    const cves = await lookupCves(pkg.name, pkg.version);
    if (cves.length === 0) {
        return null;
    }
    const references = await resolvePackageReferences(pkg.name, pkg.version);
    return {
        lockPath: pkg.lockPath,
        name: pkg.name,
        breadcrumb: pkg.breadcrumb,
        depth: pkg.depth,
        version: pkg.version,
        cves,
        references,
    };
}
export async function auditExistingVulnerabilities(lockfile, options = {}) {
    const parsed = parseLockfile(lockfile, options.projectName);
    const exclude = options.excludeLockPaths ?? new Set();
    const candidates = [...parsed.packages.values()]
        .filter((pkg) => !exclude.has(pkg.lockPath))
        .sort((a, b) => {
        if (a.depth !== b.depth) {
            return a.depth - b.depth;
        }
        return a.breadcrumb.join("/").localeCompare(b.breadcrumb.join("/"));
    });
    const concurrency = options.concurrency ?? 8;
    const results = await mapWithConcurrency(candidates, concurrency, enrichExistingPackage);
    return results.filter((result) => result !== null).sort(compareExisting);
}
//# sourceMappingURL=audit-existing.js.map