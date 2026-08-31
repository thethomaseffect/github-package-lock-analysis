import { renderToStaticMarkup } from "react-dom/server";

import type { AnalysisResult } from "../lockfile/types.js";
import { Report, reportStyles } from "./components/Report.js";

export interface BuildReportHtmlOptions {
  indexHref?: string;
}

export function buildReportHtml(
  result: AnalysisResult,
  options: BuildReportHtmlOptions = {},
): string {
  const body = renderToStaticMarkup(
    <Report result={result} indexHref={options.indexHref ?? "../../"} />,
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lockfile analysis — ${escapeHtml(result.projectName)}</title>
    <style>${reportStyles}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
