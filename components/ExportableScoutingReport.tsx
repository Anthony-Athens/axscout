"use client";

import { useState } from "react";

import {
  buildScoutingReport,
  type GeneratedScoutingReport,
  type ReportBlock,
  type ScoutingReportData,
} from "@/lib/scouting-report-export";

function ReportBlockPreview({ block }: { block: ReportBlock }) {
  if (block.type === "paragraph") {
    return <p className="text-sm leading-6 text-slate-700">{block.text}</p>;
  }

  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {block.headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {block.rows.map((row, rowIndex) => (
            <tr key={`${row.join("-")}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className="whitespace-nowrap px-3 py-2 text-slate-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExportableScoutingReport({
  data,
}: {
  data: ScoutingReportData;
}) {
  const [report, setReport] = useState<GeneratedScoutingReport | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  function generateReport() {
    setReport(buildScoutingReport(data, new Date()));
    setCopyStatus(null);
  }

  function fallbackCopy(content: string) {
    const textArea = document.createElement("textarea");
    textArea.value = content;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error("Clipboard copy was rejected.");
    }
  }

  async function copyReport(
    label: string,
    content: string | undefined
  ) {
    if (!content) {
      return;
    }

    try {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        fallbackCopy(content);
      }
      setCopyStatus(`${label} copied.`);
    } catch {
      setCopyStatus(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="export-report-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="export-report-heading"
              className="text-xl font-semibold text-slate-900"
            >
              Exportable Scouting Report
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              Beta
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Deterministic matchup analysis generated from the data above.
          </p>
        </div>
        <button
          type="button"
          onClick={generateReport}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>

      {report && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <p className="font-semibold text-slate-950">Report Preview</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyReport("Markdown", report.markdown)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
              >
                Copy Markdown
              </button>
              <button
                type="button"
                onClick={() => copyReport("HTML", report.html)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
              >
                Copy HTML
              </button>
              <button
                type="button"
                onClick={() => copyReport("Plain text", report.plainText)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
              >
                Copy Plain Text
              </button>
            </div>
          </div>

          <article className="px-5 py-6 sm:px-7">
            <h2 className="text-2xl font-bold text-slate-950">{report.title}</h2>
            {report.staleWarning && (
              <div
                role="status"
                className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              >
                {report.staleWarning}
              </div>
            )}

            <div className="mt-6 divide-y divide-slate-200">
              {report.sections.map((section) => (
                <section key={section.heading} className="py-6 first:pt-0">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {section.heading}
                  </h3>
                  <div className="mt-3 space-y-4">
                    {section.blocks.map((block, index) => (
                      <ReportBlockPreview
                        key={`${section.heading}-${block.type}-${index}`}
                        block={block}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      )}

      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-slate-600">
        {copyStatus}
      </p>
    </section>
  );
}
