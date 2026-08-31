import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PackageRow } from "./PackageRow.js";
export function Report({ result }) {
    return (_jsxs("main", { children: [_jsxs("header", { children: [_jsx("h1", { children: "Nested dependency lockfile report" }), _jsxs("p", { className: "muted", children: ["Project: ", result.projectName] }), _jsxs("div", { className: "summary", children: [_jsxs("div", { className: "summary-card", children: [_jsx("strong", { children: result.changedCount }), " changed"] }), _jsxs("div", { className: "summary-card", children: [_jsx("strong", { children: result.redCount }), " known CVE"] }), _jsxs("div", { className: "summary-card", children: [_jsx("strong", { children: result.yellowCount }), " review"] })] })] }), result.changes.length === 0 ? (_jsx("p", { className: "empty", children: "No package version changes detected in package-lock.json." })) : (result.changes.map((change) => (_jsx(PackageRow, { change: change }, change.lockPath))))] }));
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
//# sourceMappingURL=Report.js.map