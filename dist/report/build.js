import { jsx as _jsx } from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { Report, reportStyles } from "./components/Report.js";
export function buildReportHtml(result) {
    const body = renderToStaticMarkup(_jsx(Report, { result: result }));
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
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
//# sourceMappingURL=build.js.map