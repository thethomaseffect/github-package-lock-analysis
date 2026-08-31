import { buildNpmVersionUrl } from "./urls.js";
export function buildMinimalPackageReferences(packageName, version) {
    return {
        links: [
            {
                url: buildNpmVersionUrl(packageName, version),
                label: `npm @ ${version}`,
                kind: "npm-version",
            },
        ],
    };
}
//# sourceMappingURL=minimal-references.js.map