import type { AnalysisResult } from "../../lockfile/types.js";
import { PackageRow } from "./PackageRow.js";

interface ReportProps {
  result: AnalysisResult;
}

export function Report({ result }: ReportProps) {
  return (
    <main>
      <header>
        <h1>Nested dependency lockfile report</h1>
        <p className="muted">Project: {result.projectName}</p>
        <div className="summary">
          <div className="summary-card">
            <strong>{result.changedCount}</strong> changed
          </div>
          <div className="summary-card">
            <strong>{result.redCount}</strong> known CVE
          </div>
          <div className="summary-card">
            <strong>{result.yellowCount}</strong> review
          </div>
        </div>
      </header>
      {result.changes.length === 0 ? (
        <p className="empty">No package version changes detected in package-lock.json.</p>
      ) : (
        result.changes.map((change) => (
          <PackageRow key={change.lockPath} change={change} />
        ))
      )}
    </main>
  );
}

export const reportStyles = `
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    line-height: 1.5;
  }
  body {
    margin: 0;
    background: #0f172a;
    color: #e2e8f0;
  }
  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.25rem 3rem;
  }
  header {
    margin-bottom: 2rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
  }
  .summary {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .summary-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    min-width: 120px;
  }
  .summary-card strong {
    display: block;
    font-size: 1.5rem;
  }
  .package-row {
    background: #1e293b;
    border-radius: 0.75rem;
    border: 1px solid #334155;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  .package-row.red {
    border-color: #ef4444;
    box-shadow: inset 4px 0 0 #ef4444;
  }
  .package-row.yellow {
    border-color: #eab308;
    box-shadow: inset 4px 0 0 #eab308;
  }
  .row-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .row-header h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
  }
  .badge {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
  }
  .badge.red {
    background: #7f1d1d;
    color: #fecaca;
  }
  .badge.yellow {
    background: #713f12;
    color: #fef08a;
  }
  .version, .meta {
    margin: 0.35rem 0;
  }
  .link-row {
    line-height: 1.7;
  }
  a {
    color: #93c5fd;
  }
  .muted {
    color: #94a3b8;
  }
  .hn-list {
    margin: 0.5rem 0 0;
    padding-left: 1.25rem;
  }
  .empty {
    color: #94a3b8;
  }
`;
