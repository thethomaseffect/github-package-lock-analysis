import { buildNpmPackageUrl } from "./urls.js";
const CHANGELOG_CANDIDATES = [
    "CHANGELOG.md",
    "changelog.md",
    "CHANGELOG",
    "Changelog.md",
    "History.md",
];
const DEFAULT_BRANCHES = ["main", "master"];
const cache = new Map();
export function npmRegistryPackageUrl(packageName) {
    return `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
}
export function parseGitHubRepository(repositoryUrl) {
    const normalized = repositoryUrl
        .replace(/^git\+/, "")
        .replace(/\.git$/, "")
        .replace(/^git@github.com:/, "https://github.com/")
        .replace(/^github:/, "https://github.com/")
        .trim();
    let url;
    try {
        url = new URL(normalized);
    }
    catch {
        return null;
    }
    if (!url.hostname.includes("github.com")) {
        return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        return null;
    }
    const [owner, repo] = parts;
    if (!owner || !repo) {
        return null;
    }
    const directory = parts[2] === "tree" || parts[2] === "blob" ? undefined : parts.slice(2).join("/") || undefined;
    return { owner, repo: repo.replace(/\.git$/, ""), directory };
}
export function extractRepositoryUrl(metadata) {
    const repository = metadata.repository;
    if (!repository) {
        return null;
    }
    if (typeof repository === "string") {
        return repository;
    }
    return repository.url ?? null;
}
export function buildGitHubBlobUrl(owner, repo, branch, filePath) {
    return `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
}
export function buildGitHubRawUrl(owner, repo, branch, filePath) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}
export async function urlExists(url) {
    try {
        const response = await fetch(url, { method: "HEAD", redirect: "follow" });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function fetchNpmMetadata(packageName) {
    try {
        const response = await fetch(npmRegistryPackageUrl(packageName));
        if (!response.ok) {
            return null;
        }
        return (await response.json());
    }
    catch {
        return null;
    }
}
async function findGitHubChangelog(owner, repo) {
    for (const branch of DEFAULT_BRANCHES) {
        for (const fileName of CHANGELOG_CANDIDATES) {
            const rawUrl = buildGitHubRawUrl(owner, repo, branch, fileName);
            if (await urlExists(rawUrl)) {
                return {
                    url: buildGitHubBlobUrl(owner, repo, branch, fileName),
                    label: "Changelog",
                    kind: "changelog",
                };
            }
        }
    }
    return null;
}
export async function resolveChangelogLink(packageName) {
    const cached = cache.get(packageName);
    if (cached) {
        return cached;
    }
    const npmFallback = {
        url: buildNpmPackageUrl(packageName),
        label: "Package page",
        kind: "npm",
    };
    const metadata = await fetchNpmMetadata(packageName);
    if (!metadata) {
        cache.set(packageName, npmFallback);
        return npmFallback;
    }
    const repositoryUrl = extractRepositoryUrl(metadata);
    if (!repositoryUrl) {
        cache.set(packageName, npmFallback);
        return npmFallback;
    }
    const github = parseGitHubRepository(repositoryUrl);
    if (!github) {
        cache.set(packageName, npmFallback);
        return npmFallback;
    }
    const changelog = await findGitHubChangelog(github.owner, github.repo);
    if (changelog) {
        cache.set(packageName, changelog);
        return changelog;
    }
    const releasesLink = {
        url: `https://github.com/${github.owner}/${github.repo}/releases`,
        label: "Release notes",
        kind: "releases",
    };
    cache.set(packageName, releasesLink);
    return releasesLink;
}
export function clearChangelogCache() {
    cache.clear();
}
//# sourceMappingURL=changelog.js.map