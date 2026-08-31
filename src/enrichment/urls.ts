export function buildNpmPackageUrl(packageName: string): string {
  const encoded = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);

  return `https://www.npmjs.com/package/${encoded}`;
}

export function buildChangelogUrl(packageName: string, repositoryUrl?: string): string {
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

export function buildNvdUrl(cveId: string): string {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}
