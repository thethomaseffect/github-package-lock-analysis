import { resolvePackageReferences } from "./enrichment/changelog.js";
import { lookupCves } from "./enrichment/cve.js";
import { parseLockfile } from "./lockfile/parse.js";
import type {
  ExistingVulnerability,
  PackageLockJson,
  PackageReferences,
} from "./lockfile/types.js";

export interface AuditExistingOptions {
  projectName?: string;
  excludeLockPaths?: Set<string>;
  concurrency?: number;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function compareExisting(a: ExistingVulnerability, b: ExistingVulnerability): number {
  if (a.depth !== b.depth) {
    return a.depth - b.depth;
  }

  return a.breadcrumb.join("/").localeCompare(b.breadcrumb.join("/"));
}

async function enrichExistingPackage(
  pkg: {
    lockPath: string;
    name: string;
    version: string;
    breadcrumb: string[];
    depth: number;
  },
): Promise<ExistingVulnerability | null> {
  const cves = await lookupCves(pkg.name, pkg.version);
  if (cves.length === 0) {
    return null;
  }

  const references: PackageReferences = await resolvePackageReferences(pkg.name, pkg.version);

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

export async function auditExistingVulnerabilities(
  lockfile: PackageLockJson,
  options: AuditExistingOptions = {},
): Promise<ExistingVulnerability[]> {
  const parsed = parseLockfile(lockfile, options.projectName);
  const exclude = options.excludeLockPaths ?? new Set<string>();
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

  return results.filter((result): result is ExistingVulnerability => result !== null).sort(compareExisting);
}
