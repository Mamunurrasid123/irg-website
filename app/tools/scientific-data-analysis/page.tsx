"use client";

import React, { useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { Buffer } from "buffer";

import type {
  AnalysisKey,
  DataSourceMode,
  RowData,
  RowValue,
} from "./types";

import {
  buildSummary,
  formatNumber,
} from "./utils";

import DescriptivePanel from "./components/analysis/DescriptivePanel";
import TTestPanel from "./components/analysis/TTestPanel";
// import PairedTTestPanel from "./components/analysis/PairedTTestPanel";
import LinearRegressionPanel from "./components/analysis/LinearRegressionPanel";

if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

function normalizeExcelValue(value: unknown): RowValue {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("text" in obj) return String(obj.text ?? "");
    if ("hyperlink" in obj) return String(obj.hyperlink ?? "");
    if ("formula" in obj) {
      if ("result" in obj) return String(obj.result ?? "");
      return String(obj.formula ?? "");
    }
    return JSON.stringify(obj);
  }
  return String(value);
}

function standardizeColumnName(name: string, index: number) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  return cleaned || `Column ${index + 1}`;
}

function cx(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

const analysisOptions: { key: AnalysisKey; label: string; short: string }[] = [
  { key: "descriptive", label: "Descriptive", short: "Summary statistics" },
  { key: "ttest", label: "t-Test", short: "One-sample / independent" },
  { key: "pairedTTest", label: "Paired t-Test", short: "Matched comparisons" },
  { key: "anova1", label: "One-Way ANOVA", short: "Compare 3+ groups" },
  { key: "anova2", label: "Two-Way ANOVA", short: "Two-factor effects" },
  { key: "chiSquare", label: "Chi-Square", short: "Categorical association" },
  { key: "correlation", label: "Correlation", short: "Pearson / Spearman" },
  { key: "linearRegression", label: "Linear Regression", short: "OLS modeling" },
  { key: "logisticRegression", label: "Logistic Regression", short: "Binary outcome model" },
  { key: "nonparametric", label: "Nonparametric", short: "Rank-based tests" },
  { key: "pca", label: "PCA", short: "Dimension reduction" },
  { key: "clustering", label: "Clustering", short: "Pattern discovery" },
  { key: "survival", label: "Survival", short: "Time-to-event" },
  { key: "differentialExpression", label: "Differential Expression", short: "Bioinformatics workflow" },
  { key: "publicHealth", label: "Public Health", short: "Risk and prevalence" },
  { key: "environmentalTS", label: "Environmental TS", short: "Trend and monitoring" },
];

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>("upload");
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisKey>("descriptive");

  const [selectedY, setSelectedY] = useState("");
  const [selectedX, setSelectedX] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedGroup2, setSelectedGroup2] = useState("");
  const [pairedX, setPairedX] = useState("");
  const [pairedY, setPairedY] = useState("");
  const [timeCol, setTimeCol] = useState("");
  const [eventCol, setEventCol] = useState("");
  const [mu0, setMu0] = useState("0");
  const [clusterK, setClusterK] = useState(3);

  const columns = useMemo(() => {
    return Array.from(new Set(rawData.flatMap((r) => Object.keys(r))));
  }, [rawData]);

  const profiles = useMemo(() => buildSummary(rawData, columns), [rawData, columns]);

  const numericColumns = useMemo(
    () => profiles.filter((p) => p.type === "numeric" || p.type === "binary").map((p) => p.name),
    [profiles]
  );

  const categoricalColumns = useMemo(
    () => profiles.filter((p) => p.type === "categorical" || p.type === "binary").map((p) => p.name),
    [profiles]
  );

  const dateColumns = useMemo(
    () => profiles.filter((p) => p.type === "date").map((p) => p.name),
    [profiles]
  );

  async function parseUpload(file: File) {
    const lower = file.name.toLowerCase();

    if (lower.endsWith(".csv")) {
      return new Promise<RowData[]>((resolve, reject) => {
        Papa.parse<RowData>(file, {
          header: true,
          skipEmptyLines: false,
          complete: (result) => resolve((result.data ?? []).map((row) => ({ ...row }))),
          error: (err) => reject(err),
        });
      });
    }

    if (lower.endsWith(".xlsx")) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const ws = workbook.worksheets[0];
      const rowsRaw: RowData[] = [];
      let headers: string[] = [];

      ws.eachRow((row, rowNumber) => {
        const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
        if (rowNumber === 1) {
          headers = vals.map((v, i) =>
            standardizeColumnName(String(normalizeExcelValue(v) ?? ""), i)
          );
        } else {
          const obj: RowData = {};
          headers.forEach((h, i) => {
            obj[h] = normalizeExcelValue(vals[i]);
          });
          rowsRaw.push(obj);
        }
      });

      return rowsRaw;
    }

    throw new Error("Unsupported file format. Please upload .csv or .xlsx");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const parsed = await parseUpload(f);
      setFileName(f.name);
      setRawData(parsed);

      const cols = Array.from(new Set(parsed.flatMap((r) => Object.keys(r))));
      setSelectedY(cols[0] ?? "");
      setSelectedX(cols.slice(0, 2));
      setSelectedGroup(cols[1] ?? "");
      setSelectedGroup2(cols[2] ?? "");
      setPairedX(cols[0] ?? "");
      setPairedY(cols[1] ?? "");
      setTimeCol(cols[0] ?? "");
      setEventCol(cols[1] ?? "");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function togglePredictor(col: string) {
    setSelectedX((prev) =>
      prev.includes(col) ? prev.filter((x) => x !== col) : [...prev, col]
    );
  }

  const commonProps = {
    cleanedData: rawData,
    selectedY,
    selectedX,
    selectedGroup,
    selectedGroup2,
    pairedX,
    pairedY,
    timeCol,
    eventCol,
    mu0,
    clusterK,
    formatNumber,
  };

  return (
    <div className="container" style={{ padding: "45px 40px",background: "rgba(97, 191, 59, 0.85)", borderRadius: 16 }}>
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.35fr_0.9fr] lg:px-8">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
                 This page is under development for the IRG Research Platform | 
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                   Professional Analytics Workspace | 
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                   Upload · Analyze · Interpret · Export
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                Scientific Data Analysis Platform
              </h1>

              <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-600 md:text-base">
                A modern, research-grade interface for scientific data analysis.
                Upload structured datasets, configure statistical workflows, inspect
                variables, and render mathematically transparent results with a clean,
                publication-oriented layout.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  "Descriptive statistics and inference",
                  "t-tests, ANOVA, regression, chi-square",
                  "PCA, clustering, survival workflows",
                  "Mathematical derivation panel",
                  "Interpretation and reporting layer",
                  "Designed for research and teaching",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <KpiCard label="Dataset" value={fileName || "No file loaded"} hint="Current source" />
              <div className="grid grid-cols-2 gap-4">
                <KpiCard label="Rows" value={`${rawData.length}`} />
                <KpiCard label="Columns" value={`${columns.length}`} />
              </div>
              <KpiCard
                label="Active Analysis"
                value={analysisOptions.find((a) => a.key === analysis)?.label || "Descriptive"}
                hint="Selected workflow"
              />
            </div>
          </div>
        </section>

        {/* Main workspace */}
        <div className="mt-8 grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* Left rail */}
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Panel title="Data source" subtitle="Load dataset into the workspace">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDataSourceMode("upload")}
                    className={cx(
                      "flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      dataSourceMode === "upload"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-300 bg-white text-slate-700"
                    )}
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => setDataSourceMode("manual")}
                    className={cx(
                      "flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      dataSourceMode === "manual"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-300 bg-white text-slate-700"
                    )}
                  >
                    Manual
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />

                <p className="text-xs leading-6 text-slate-500">
                  Supported formats: CSV and XLSX. The system auto-detects columns
                  after upload.
                </p>
              </div>
            </Panel>

            <Panel title="Analysis menu" subtitle="Choose the active statistical workflow">
              <div className="space-y-2">
                {analysisOptions.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAnalysis(item.key)}
                    className={cx(
                      "w-full rounded-2xl border p-3 text-left transition",
                      analysis === item.key
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.short}</div>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>

          {/* Main area */}
          <main className="space-y-8">
            <Panel
              title="Variable configuration"
              subtitle="Choose outcome, grouping, paired, time, and predictor variables"
            >
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Response / Y
                  </label>
                  <select
                    value={selectedY}
                    onChange={(e) => setSelectedY(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select Y</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Group A
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select group</option>
                    {categoricalColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Group B
                  </label>
                  <select
                    value={selectedGroup2}
                    onChange={(e) => setSelectedGroup2(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select second group</option>
                    {categoricalColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Hypothesized mean μ₀
                  </label>
                  <input
                    value={mu0}
                    onChange={(e) => setMu0(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Paired X
                  </label>
                  <select
                    value={pairedX}
                    onChange={(e) => setPairedX(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select X</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Paired Y
                  </label>
                  <select
                    value={pairedY}
                    onChange={(e) => setPairedY(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select Y</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Time column
                  </label>
                  <select
                    value={timeCol}
                    onChange={(e) => setTimeCol(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select time</option>
                    {[...dateColumns, ...columns].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Event column
                  </label>
                  <select
                    value={eventCol}
                    onChange={(e) => setEventCol(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select event</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  Predictor / feature variables
                </div>
                <div className="flex flex-wrap gap-2">
                  {numericColumns.map((c) => (
                    <button
                      key={c}
                      onClick={() => togglePredictor(c)}
                      className={cx(
                        "rounded-full border px-3 py-2 text-xs font-semibold transition",
                        selectedX.includes(c)
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white text-slate-700"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="grid gap-8 2xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Column summary" subtitle="Detected structure and data types">
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Column</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Missing</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Unique</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => (
                        <tr key={p.name} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600">{p.type}</td>
                          <td className="px-4 py-3 text-slate-600">{p.missing}</td>
                          <td className="px-4 py-3 text-slate-600">{p.unique}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Analysis workspace" subtitle="Results panel for the selected workflow">
                {analysis === "descriptive" && <DescriptivePanel {...commonProps} />}
                {analysis === "ttest" && <TTestPanel {...commonProps} />}
                {/* {analysis === "pairedTTest" && <PairedTTestPanel {...commonProps} />} */}
                {analysis === "linearRegression" && <LinearRegressionPanel {...commonProps} />}

                {[
                  "anova1",
                  "anova2",
                  "chiSquare",
                  "correlation",
                  "logisticRegression",
                  "nonparametric",
                  "pca",
                  "clustering",
                  "survival",
                  "differentialExpression",
                  "publicHealth",
                  "environmentalTS",
                ].includes(analysis) && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <div className="text-lg font-semibold text-slate-800">
                      {analysisOptions.find((a) => a.key === analysis)?.label}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Connect the corresponding panel component here in the same layout.
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}