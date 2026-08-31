export interface LockfilePackage {
  name?: string;
  version?: string;
  resolved?: string;
  dependencies?: Record<string, string>;
  dev?: boolean;
}

export interface PackageLockJson {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, LockfilePackage>;
  dependencies?: Record<string, LockfilePackage>;
}

export interface ParsedPackage {
  /** Lockfile key, e.g. node_modules/lodash */
  lockPath: string;
  name: string;
  version: string;
  /** Segments from project root, e.g. ["sample-project", "lodash"] */
  breadcrumb: string[];
  depth: number;
}

export type SecurityLevel = "red" | "yellow";

export interface CveReference {
  id: string;
  url: string;
  summary?: string;
}

export interface HackerNewsReference {
  title: string;
  url: string;
  date: string;
}

export interface ReferenceLink {
  url: string;
  label: string;
  kind: "npm-version" | "changelog" | "releases" | "commit";
}

export interface PackageReferences {
  links: ReferenceLink[];
}

export interface PackageChange {
  lockPath: string;
  name: string;
  breadcrumb: string[];
  depth: number;
  oldVersion: string | null;
  newVersion: string;
  securityLevel: SecurityLevel;
  cves: CveReference[];
  hackerNews: HackerNewsReference[];
  references: PackageReferences;
}

export interface AnalysisResult {
  projectName: string;
  changes: PackageChange[];
  changedCount: number;
  redCount: number;
  yellowCount: number;
}

export interface AnalysisOptions {
  projectName?: string;
  includeHackerNews?: boolean;
}
