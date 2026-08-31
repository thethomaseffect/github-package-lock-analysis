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
export function buildGitHubBlobUrl(owner, repo, branch, filePath, fragment) {
    const base = `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
    return fragment ? `${base}#${fragment}` : base;
}
export function buildGitHubRawUrl(owner, repo, branch, filePath) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}
export function buildGitHubReleaseTagUrl(owner, repo, version) {
    const tag = version.startsWith("v") ? version : `v${version}`;
    return `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}`;
}
/** GitHub-compatible slug for markdown heading anchors. */
export function githubMarkdownAnchor(headerText) {
    return headerText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function headerMatchesVersion(headerText, version) {
    const normalizedVersion = version.replace(/^v/i, "");
    const patterns = [
        new RegExp(`\\bv${escapeRegExp(normalizedVersion)}\\b`, "i"),
        new RegExp(`\\[v?${escapeRegExp(normalizedVersion)}\\]`),
        new RegExp(`\\bv?${escapeRegExp(normalizedVersion)}(?:\\s|$|\\))`, "i"),
    ];
    return patterns.some((pattern) => pattern.test(headerText));
}
export function findVersionHeaderAnchor(changelogContent, version) {
    for (const line of changelogContent.split(/\r?\n/)) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (!match?.[2]) {
            continue;
        }
        const headerText = match[2].trim();
        if (!headerMatchesVersion(headerText, version)) {
            continue;
        }
        return githubMarkdownAnchor(headerText);
    }
    return null;
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
async function fetchText(url) {
    try {
        const response = await fetch(url, { redirect: "follow" });
        if (!response.ok) {
            return null;
        }
        return await response.text();
    }
    catch {
        return null;
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
async function findChangelogFileLocation(owner, repo) {
    for (const branch of DEFAULT_BRANCHES) {
        for (const fileName of CHANGELOG_CANDIDATES) {
            const rawUrl = buildGitHubRawUrl(owner, repo, branch, fileName);
            if (await urlExists(rawUrl)) {
                return { owner, repo, branch, fileName };
            }
        }
    }
    return null;
}
async function resolveChangelogFileLink(location, version) {
    const rawUrl = buildGitHubRawUrl(location.owner, location.repo, location.branch, location.fileName);
    const content = await fetchText(rawUrl);
    const anchor = content ? findVersionHeaderAnchor(content, version) : null;
    const url = buildGitHubBlobUrl(location.owner, location.repo, location.branch, location.fileName, anchor ?? undefined);
    return {
        url,
        label: anchor ? `Changelog (${version})` : "Changelog",
        kind: "changelog",
    };
}
export async function resolveChangelogLink(packageName, version) {
    const cacheKey = `${packageName}@${version}`;
    const cached = cache.get(cacheKey);
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
        cache.set(cacheKey, npmFallback);
        return npmFallback;
    }
    const repositoryUrl = extractRepositoryUrl(metadata);
    if (!repositoryUrl) {
        cache.set(cacheKey, npmFallback);
        return npmFallback;
    }
    const github = parseGitHubRepository(repositoryUrl);
    if (!github) {
        cache.set(cacheKey, npmFallback);
        return npmFallback;
    }
    const changelogLocation = await findChangelogFileLocation(github.owner, github.repo);
    if (changelogLocation) {
        const link = await resolveChangelogFileLink(changelogLocation, version);
        cache.set(cacheKey, link);
        return link;
    }
    const releasesLink = {
        url: buildGitHubReleaseTagUrl(github.owner, github.repo, version),
        label: `Release notes (${version})`,
        kind: "releases",
    };
    cache.set(cacheKey, releasesLink);
    return releasesLink;
}
export function clearChangelogCache() {
    cache.clear();
}
//# sourceMappingURL=changelog.js.map