export function buildNpmPackageUrl(packageName: string): string {
  const encoded = packageName.startsWith("@")
    ? `@${encodeURIComponent(packageName.slice(1))}`
    : encodeURIComponent(packageName);

  return `https://www.npmjs.com/package/${encoded}`;
}

export function buildNvdUrl(cveId: string): string {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}
