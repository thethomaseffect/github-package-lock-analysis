import type { PackageReferences } from "../lockfile/types.js";
import { buildNpmVersionUrl } from "./urls.js";

export function buildMinimalPackageReferences(
  packageName: string,
  version: string,
): PackageReferences {
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
