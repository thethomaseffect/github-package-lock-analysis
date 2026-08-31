import type { PackageLockJson, ParsedPackage } from "./types.js";

interface V1Dependency {
  version?: string;
  dependencies?: Record<string, V1Dependency>;
}

function segmentsFromLockPath(lockPath: string): string[] {
  if (!lockPath) {
    return [];
  }

  return lockPath
    .split("node_modules/")
    .filter(Boolean)
    .map((segment) => segment.replace(/\/$/, ""));
}

function packageNameFromLockPath(lockPath: string): string {
  const segments = segmentsFromLockPath(lockPath);
  return segments.at(-1) ?? lockPath;
}

function readRootName(lockfile: PackageLockJson, override?: string): string {
  if (override?.trim()) {
    return override.trim();
  }

  const root = lockfile.packages?.[""];
  return root?.name ?? lockfile.name ?? "project";
}

export function parseLockfile(
  lockfile: PackageLockJson,
  projectNameOverride?: string,
): { projectName: string; packages: Map<string, ParsedPackage> } {
  const projectName = readRootName(lockfile, projectNameOverride);
  const packages = new Map<string, ParsedPackage>();

  if (lockfile.packages) {
    for (const [lockPath, pkg] of Object.entries(lockfile.packages)) {
      if (!lockPath || !pkg.version) {
        continue;
      }

      const segments = segmentsFromLockPath(lockPath);
      const name = pkg.name ?? packageNameFromLockPath(lockPath);
      const breadcrumb = [projectName, ...segments];

      packages.set(lockPath, {
        lockPath,
        name,
        version: pkg.version,
        breadcrumb,
        depth: segments.length,
      });
    }

    return { projectName, packages };
  }

  // Lockfile v1 fallback via nested dependencies tree
  if (lockfile.dependencies) {
    walkDependencies(
      lockfile.dependencies as Record<string, V1Dependency>,
      projectName,
      [],
      packages,
    );
  }

  return { projectName, packages };
}

function walkDependencies(
  dependencies: Record<string, V1Dependency>,
  projectName: string,
  parentSegments: string[],
  packages: Map<string, ParsedPackage>,
): void {
  for (const [name, pkg] of Object.entries(dependencies)) {
    if (!pkg.version) {
      continue;
    }

    const segments = [...parentSegments, name];
    const lockPath = segments.map((segment) => `node_modules/${segment}`).join("/");

    packages.set(lockPath, {
      lockPath,
      name,
      version: pkg.version,
      breadcrumb: [projectName, ...segments],
      depth: segments.length,
    });

    if (pkg.dependencies) {
      walkDependencies(pkg.dependencies, projectName, segments, packages);
    }
  }
}

export function formatBreadcrumb(breadcrumb: string[]): string {
  return breadcrumb.join(" > ");
}
