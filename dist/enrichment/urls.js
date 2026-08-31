export function buildNpmPackageUrl(packageName) {
    const encoded = packageName.startsWith("@")
        ? `@${encodeURIComponent(packageName.slice(1))}`
        : encodeURIComponent(packageName);
    return `https://www.npmjs.com/package/${encoded}`;
}
export function buildNpmVersionUrl(packageName, version) {
    const encoded = packageName.startsWith("@")
        ? `@${encodeURIComponent(packageName.slice(1))}`
        : encodeURIComponent(packageName);
    return `https://www.npmjs.com/package/${encoded}/v/${version}`;
}
export function buildNvdUrl(cveId) {
    return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}
//# sourceMappingURL=urls.js.map