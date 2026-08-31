import { buildNvdUrl } from "./urls.js";
const cache = new Map();
export async function lookupCves(packageName, version) {
    const cacheKey = `${packageName}@${version}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }
    try {
        const response = await fetch("https://api.osv.dev/v1/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                package: { name: packageName, ecosystem: "npm" },
                version,
            }),
        });
        if (!response.ok) {
            cache.set(cacheKey, []);
            return [];
        }
        const data = (await response.json());
        const cves = extractCveReferences(data.vulns ?? []);
        cache.set(cacheKey, cves);
        return cves;
    }
    catch {
        cache.set(cacheKey, []);
        return [];
    }
}
function extractCveReferences(vulns) {
    const seen = new Set();
    const references = [];
    for (const vuln of vulns) {
        const ids = [vuln.id, ...(vuln.aliases ?? [])].filter((id) => id.startsWith("CVE-"));
        for (const id of ids) {
            if (seen.has(id)) {
                continue;
            }
            seen.add(id);
            references.push({
                id,
                url: buildNvdUrl(id),
                summary: vuln.summary,
            });
        }
    }
    return references;
}
export function clearCveCache() {
    cache.clear();
}
//# sourceMappingURL=cve.js.map