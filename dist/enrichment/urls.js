export function buildNpmPackageUrl(packageName) {
    const encoded = packageName.startsWith("@")
        ? `@${encodeURIComponent(packageName.slice(1))}`
        : encodeURIComponent(packageName);
    return `https://www.npmjs.com/package/${encoded}`;
}
export function buildChangelogUrl(packageName, repositoryUrl) {
    if (repositoryUrl) {
        const normalized = repositoryUrl
            .replace(/^git\+/, "")
            .replace(/\.git$/, "")
            .replace(/^git@github.com:/, "https://github.com/");
        if (normalized.includes("github.com")) {
            return `${normalized}/releases`;
        }
    }
    return buildNpmPackageUrl(packageName);
}
export function buildNvdUrl(cveId) {
    return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}
//# sourceMappingURL=urls.js.map