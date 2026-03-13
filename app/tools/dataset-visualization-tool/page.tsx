"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  Legend,
} from "recharts";

type ChartType = "histogram" | "scatter" | "bar" | "line" | "box";
type AggregationType = "count" | "sum" | "mean";
type Row = Record<string, unknown>;

type HistogramDatum = {
  bin: string;
  start: number;
  end: number;
  frequency: number;
};

type ScatterDatum = {
  x: number;
  y: number;
};

type BarDatum = {
  category: string;
  value: number;
  n: number;
};

type LineDatum = {
  x: number | string;
  y: number;
};

type BoxDatum = {
  group: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outliers: number[];
  n: number;
};

type ChartData = HistogramDatum[] | ScatterDatum[] | BarDatum[] | LineDatum[] | BoxDatum[];

function isNumericValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n);
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function formatNumber(value: number, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]) {
  const m = mean(arr);
  return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

function stdDev(arr: number[]) {
  return Math.sqrt(variance(arr));
}

function median(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(arr: number[], q: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function covariance(x: number[], y: number[]) {
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;

  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }

  return sum / (x.length - 1);
}

function correlation(x: number[], y: number[]) {
  return covariance(x, y) / (stdDev(x) * stdDev(y));
}

function linearRegression(x: number[], y: number[]) {
  const mx = mean(x);
  const my = mean(y);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - mx) * (y[i] - my);
    denominator += (x[i] - mx) ** 2;
  }

  const slope = numerator / denominator;
  const intercept = my - slope * mx;

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < x.length; i++) {
    const predicted = intercept + slope * x[i];
    ssTot += (y[i] - my) ** 2;
    ssRes += (y[i] - predicted) ** 2;
  }

  const r2 = 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

function getNumericColumn(rows: Row[], column: string) {
  return rows
    .map((r) => toNumber(r[column]))
    .filter((v) => Number.isFinite(v));
}

function getPairedNumericColumns(rows: Row[], xCol: string, yCol: string) {
  const pairs: ScatterDatum[] = [];

  for (const row of rows) {
    const x = toNumber(row[xCol]);
    const y = toNumber(row[yCol]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ x, y });
    }
  }

  return pairs;
}

function detectColumnTypes(rows: Row[], headers: string[]) {
  return headers.map((header) => {
    const nonEmpty = rows
      .map((r) => r[header])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");

    const numericCount = nonEmpty.filter(isNumericValue).length;
    const isNumeric =
      nonEmpty.length > 0 && numericCount / Math.max(nonEmpty.length, 1) >= 0.8;

    return {
      name: header,
      type: isNumeric ? "numeric" : "categorical",
    };
  });
}

function buildHistogram(values: number[], requestedBins: number): HistogramDatum[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  const bins =
    requestedBins > 0
      ? requestedBins
      : Math.max(1, Math.round(1 + 3.322 * Math.log10(values.length)));

  const width = max === min ? 1 : (max - min) / bins;
  const counts = Array(bins).fill(0);

  for (const value of values) {
    let index = Math.floor((value - min) / width);
    if (index === bins) index = bins - 1;
    counts[index]++;
  }

  return counts.map((count, i) => {
    const start = min + i * width;
    const end = i === bins - 1 ? max : start + width;
    return {
      bin: `${formatNumber(start, 2)} – ${formatNumber(end, 2)}`,
      start,
      end,
      frequency: count,
    };
  });
}

function buildBarData(
  rows: Row[],
  xVar: string,
  yVar: string,
  aggregation: AggregationType
): BarDatum[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const x = row[xVar];
    if (x === null || x === undefined || String(x).trim() === "") continue;
    const key = String(x);

    if (!groups.has(key)) groups.set(key, []);

    if (aggregation === "count") {
      groups.get(key)!.push(1);
    } else {
      const y = toNumber(row[yVar]);
      if (Number.isFinite(y)) groups.get(key)!.push(y);
    }
  }

  return Array.from(groups.entries()).map(([category, values]) => {
    let result = 0;
    if (aggregation === "count") result = values.length;
    if (aggregation === "sum") result = values.reduce((a, b) => a + b, 0);
    if (aggregation === "mean") result = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      category,
      value: result,
      n: values.length,
    };
  });
}

function buildLineData(rows: Row[], xVar: string, yVar: string): LineDatum[] {
  const paired: LineDatum[] = [];
  const xNumeric = rows.some((r) => isNumericValue(r[xVar]));

  for (const row of rows) {
    const y = toNumber(row[yVar]);
    if (!Number.isFinite(y)) continue;

    const rawX = row[xVar];
    if (rawX === null || rawX === undefined || String(rawX).trim() === "") continue;

    paired.push({
      x: xNumeric && isNumericValue(rawX) ? Number(rawX) : String(rawX),
      y,
    });
  }

  if (xNumeric) {
    paired.sort((a, b) => Number(a.x) - Number(b.x));
  }

  return paired;
}

function buildBoxData(rows: Row[], numericVar: string, groupVar: string): BoxDatum[] {
  const groups = new Map<string, number[]>();

  if (!groupVar) {
    const values = getNumericColumn(rows, numericVar);
    groups.set("All Data", values);
  } else {
    for (const row of rows) {
      const g = row[groupVar];
      const x = toNumber(row[numericVar]);
      if (
        g !== null &&
        g !== undefined &&
        String(g).trim() !== "" &&
        Number.isFinite(x)
      ) {
        const key = String(g);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(x);
      }
    }
  }

  return Array.from(groups.entries())
    .map(([group, values]) => {
      if (values.length === 0) return null;

      const sorted = [...values].sort((a, b) => a - b);
      const q1 = quantile(sorted, 0.25);
      const q2 = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;

      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;

      const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
      const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

      return {
        group,
        min: Math.min(...nonOutliers),
        q1,
        median: q2,
        q3,
        max: Math.max(...nonOutliers),
        iqr,
        lowerFence,
        upperFence,
        outliers,
        n: sorted.length,
      };
    })
    .filter((v): v is BoxDatum => v !== null);
}

function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function BoxPlotSVG({ data, title }: { data: BoxDatum[]; title: string }) {
  const width = 900;
  const height = 380;
  const left = 80;
  const right = 40;
  const top = 50;
  const bottom = 70;

  const values = data.flatMap((d) => [d.min, d.q1, d.median, d.q3, d.max, ...d.outliers]);
  const globalMin = Math.min(...values);
  const globalMax = Math.max(...values);

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const xScale = (i: number) =>
    left + ((i + 0.5) / Math.max(data.length, 1)) * plotWidth;

  const yScale = (v: number) => {
    if (globalMax === globalMin) return top + plotHeight / 2;
    return top + plotHeight - ((v - globalMin) / (globalMax - globalMin)) * plotHeight;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ maxWidth: "100%" }}>
        <text x={width / 2} y={24} textAnchor="middle" fontSize="18" fontWeight="700">
          {title}
        </text>

        <line x1={left} y1={top + plotHeight} x2={width - right} y2={top + plotHeight} stroke="#444" />
        <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="#444" />

        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const value = globalMin + p * (globalMax - globalMin);
          const y = yScale(value);
          return (
            <g key={idx}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e6e6e6" />
              <text x={left - 10} y={y + 4} textAnchor="end" fontSize="12">
                {formatNumber(value, 2)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = xScale(i);
          const boxWidth = Math.min(80, plotWidth / Math.max(data.length, 1) / 2.5);

          return (
            <g key={d.group}>
              <line x1={x} y1={yScale(d.min)} x2={x} y2={yScale(d.max)} stroke="#111" strokeWidth="2" />
              <rect
                x={x - boxWidth / 2}
                y={yScale(d.q3)}
                width={boxWidth}
                height={Math.max(2, yScale(d.q1) - yScale(d.q3))}
                fill="#ffd54f"
                stroke="#111"
                strokeWidth="2"
              />
              <line
                x1={x - boxWidth / 2}
                y1={yScale(d.median)}
                x2={x + boxWidth / 2}
                y2={yScale(d.median)}
                stroke="#c62828"
                strokeWidth="3"
              />
              <line
                x1={x - boxWidth / 3}
                y1={yScale(d.min)}
                x2={x + boxWidth / 3}
                y2={yScale(d.min)}
                stroke="#111"
                strokeWidth="2"
              />
              <line
                x1={x - boxWidth / 3}
                y1={yScale(d.max)}
                x2={x + boxWidth / 3}
                y2={yScale(d.max)}
                stroke="#111"
                strokeWidth="2"
              />

              {d.outliers.map((o, idx) => (
                <circle key={idx} cx={x} cy={yScale(o)} r={4} fill="#0d47a1" />
              ))}

              <text x={x} y={top + plotHeight + 20} textAnchor="middle" fontSize="12">
                {d.group}
              </text>
              <text x={x} y={top + plotHeight + 38} textAnchor="middle" fontSize="11" fill="#666">
                n = {d.n}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DatasetVisualizationToolPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const [chartType, setChartType] = useState<ChartType>("histogram");
  const [xVar, setXVar] = useState("");
  const [yVar, setYVar] = useState("");
  const [groupVar, setGroupVar] = useState("");
  const [bins, setBins] = useState("0");
  const [aggregation, setAggregation] = useState<AggregationType>("count");
  const [chartTitle, setChartTitle] = useState("Dataset Visualization");

  const chartRef = useRef<HTMLDivElement | null>(null);

  async function handleUpload(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(firstSheet, { defval: "" });

    const extractedHeaders = json.length ? Object.keys(json[0]) : [];

    setRows(json);
    setHeaders(extractedHeaders);
    setFileName(file.name);

    setXVar(extractedHeaders[0] ?? "");
    setYVar(extractedHeaders[1] ?? extractedHeaders[0] ?? "");
    setGroupVar("");
    setChartTitle("Dataset Visualization");
  }

  const columnInfo = useMemo(() => detectColumnTypes(rows, headers), [rows, headers]);

  const numericColumns = useMemo(
    () => columnInfo.filter((c) => c.type === "numeric").map((c) => c.name),
    [columnInfo]
  );

  const categoricalColumns = useMemo(
    () => columnInfo.filter((c) => c.type === "categorical").map((c) => c.name),
    [columnInfo]
  );

  const chartData = useMemo<ChartData | null>(() => {
    if (!rows.length) return null;

    if (chartType === "histogram") {
      const values = getNumericColumn(rows, xVar);
      if (!values.length) return null;
      return buildHistogram(values, Number(bins));
    }

    if (chartType === "scatter") {
      const pairs = getPairedNumericColumns(rows, xVar, yVar);
      if (!pairs.length) return null;
      return pairs;
    }

    if (chartType === "bar") {
      return buildBarData(rows, xVar, yVar, aggregation);
    }

    if (chartType === "line") {
      return buildLineData(rows, xVar, yVar);
    }

    if (chartType === "box") {
      const box = buildBoxData(rows, xVar, groupVar);
      if (!box.length) return null;
      return box;
    }

    return null;
  }, [rows, chartType, xVar, yVar, groupVar, bins, aggregation]);

  const mathematicalSection = useMemo(() => {
    if (!chartData || !rows.length) return null;

    if (chartType === "histogram") {
      const values = getNumericColumn(rows, xVar);
      if (!values.length) return null;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const n = values.length;
      const k =
        Number(bins) > 0
          ? Number(bins)
          : Math.max(1, Math.round(1 + 3.322 * Math.log10(n)));
      const h = max === min ? 1 : (max - min) / k;

      return {
        title: "Mathematical Section for Histogram",
        points: [
          `Variable analysed: ${xVar}`,
          `Number of observations: n = ${n}`,
          `Minimum value = ${formatNumber(min, 4)}`,
          `Maximum value = ${formatNumber(max, 4)}`,
          `Number of bins: k = ${k}`,
          `Bin width: h = (max - min) / k = (${formatNumber(max, 4)} - ${formatNumber(min, 4)}) / ${k} = ${formatNumber(h, 4)}`,
          `The histogram displays the frequency distribution of the variable across these class intervals.`,
        ],
      };
    }

    if (chartType === "scatter") {
      const pairs = getPairedNumericColumns(rows, xVar, yVar);
      if (pairs.length < 2) return null;

      const x = pairs.map((p) => p.x);
      const y = pairs.map((p) => p.y);

      const mx = mean(x);
      const my = mean(y);
      const cov = covariance(x, y);
      const r = correlation(x, y);
      const reg = linearRegression(x, y);

      return {
        title: "Mathematical Section for Scatter Plot",
        points: [
          `Variables analysed: x = ${xVar}, y = ${yVar}`,
          `Number of paired observations: n = ${pairs.length}`,
          `Mean of x: x̄ = ${formatNumber(mx, 4)}`,
          `Mean of y: ȳ = ${formatNumber(my, 4)}`,
          `Sample covariance: Cov(x, y) = ${formatNumber(cov, 4)}`,
          `Sample correlation: r = ${formatNumber(r, 4)}`,
          `Least-squares regression line: ŷ = a + bx`,
          `Slope: b = ${formatNumber(reg.slope, 4)}`,
          `Intercept: a = ${formatNumber(reg.intercept, 4)}`,
          `Coefficient of determination: R² = ${formatNumber(reg.r2, 4)}`,
        ],
      };
    }

    if (chartType === "bar") {
      const data = chartData as BarDatum[];
      const total = data.reduce((a, b) => a + b.value, 0);

      return {
        title: "Mathematical Section for Bar Chart",
        points: [
          `Category variable: ${xVar}`,
          aggregation === "count"
            ? `The chart displays category frequencies.`
            : `The chart displays grouped ${aggregation} values of ${yVar}.`,
          aggregation === "count"
            ? `For each category c, frequency f(c) = number of records in that category.`
            : aggregation === "sum"
            ? `For each category c, displayed value = Σy within category c.`
            : `For each category c, displayed value = (Σy) / n_c.`,
          `Number of displayed categories = ${data.length}`,
          `Total of displayed bar values = ${formatNumber(total, 4)}`,
        ],
      };
    }

    if (chartType === "line") {
      const data = chartData as LineDatum[];
      const ys = data.map((d) => d.y);
      const avgY = mean(ys);

      let avgRateText =
        "Average rate of change is not computed because the x-variable is categorical or not fully numeric.";

      const numericX = data.every((d) => typeof d.x === "number");
      if (numericX && data.length >= 2) {
        const first = data[0];
        const last = data[data.length - 1];
        const dx = Number(last.x) - Number(first.x);
        if (dx !== 0) {
          const avgRate = (last.y - first.y) / dx;
          avgRateText = `Average rate of change = [y_last - y_first] / [x_last - x_first] = (${formatNumber(
            last.y,
            4
          )} - ${formatNumber(first.y, 4)}) / (${formatNumber(Number(last.x), 4)} - ${formatNumber(
            Number(first.x),
            4
          )}) = ${formatNumber(avgRate, 4)}.`;
        }
      }

      return {
        title: "Mathematical Section for Line Graph",
        points: [
          `Variables analysed: x = ${xVar}, y = ${yVar}`,
          `Number of plotted observations = ${data.length}`,
          `Mean of y-values = ${formatNumber(avgY, 4)}`,
          avgRateText,
          `The line graph shows how ${yVar} changes across the ordered values of ${xVar}.`,
        ],
      };
    }

    if (chartType === "box") {
      const box = chartData as BoxDatum[];

      const details = box.flatMap((b) => [
        `Group ${b.group}:`,
        `n = ${b.n}, min = ${formatNumber(b.min, 4)}, Q1 = ${formatNumber(b.q1, 4)}, median = ${formatNumber(
          b.median,
          4
        )}, Q3 = ${formatNumber(b.q3, 4)}, max = ${formatNumber(b.max, 4)}`,
        `IQR = Q3 - Q1 = ${formatNumber(b.q3, 4)} - ${formatNumber(b.q1, 4)} = ${formatNumber(b.iqr, 4)}`,
        `Lower fence = Q1 - 1.5(IQR) = ${formatNumber(b.lowerFence, 4)}`,
        `Upper fence = Q3 + 1.5(IQR) = ${formatNumber(b.upperFence, 4)}`,
        `Number of outliers = ${b.outliers.length}`,
      ]);

      return {
        title: "Mathematical Section for Box Plot",
        points: [
          `Numeric variable analysed: ${xVar}`,
          groupVar
            ? `Grouping variable: ${groupVar}`
            : `No grouping variable selected. One box plot is drawn for the full dataset.`,
          `A box plot is based on the five-number summary and the interquartile range.`,
          ...details,
        ],
      };
    }

    return null;
  }, [chartData, rows, chartType, xVar, yVar, groupVar, bins, aggregation]);

  async function downloadChartImage() {
    if (!chartRef.current) return;

    const canvas = await html2canvas(chartRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    downloadCanvasAsPNG(canvas, "dataset-visualization-chart.png");
  }

  const previewRows = rows.slice(0, 8);

  return (
    <div className="container" style={{ maxWidth: 1200, padding: "40px 20px",background: "#f4f00d", borderRadius: 12 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
        Dataset Visualization Tool
      </h1>

      <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 24 }}>
        Generate visual representations of uploaded datasets such as histograms,
        bar charts, scatter plots, line graphs, and box plots. This tool is designed
        for exploratory data analysis, teaching, learning, and presentation-ready outputs.
      </p>

      <SectionCard title="Upload Dataset">
        <div
          style={{
            border: "1px dashed #bbb",
            borderRadius: 10,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <label style={labelStyle}>Upload Excel or CSV file</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          {fileName && (
            <p style={{ marginTop: 10, marginBottom: 0, color: "#555" }}>
              Uploaded file: <strong>{fileName}</strong>
            </p>
          )}
        </div>
      </SectionCard>

      {rows.length > 0 && (
        <>
          <SectionCard title="Dataset Summary">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <SummaryBox label="Number of rows" value={String(rows.length)} />
              <SummaryBox label="Number of variables" value={String(headers.length)} />
              <SummaryBox label="Numeric variables" value={String(numericColumns.length)} />
              <SummaryBox label="Categorical variables" value={String(categoricalColumns.length)} />
            </div>

            <div style={{ marginTop: 20 }}>
              <strong>Detected variable types</strong>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {columnInfo.map((col) => (
                  <span
                    key={col.name}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: col.type === "numeric" ? "#fff3cd" : "#e8f4ff",
                      border: "1px solid #ddd",
                      fontSize: "0.95rem",
                    }}
                  >
                    {col.name} — {col.type}
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Chart Controls">
            <InputGrid>
              <Select
                label="Chart type"
                value={chartType}
                onChange={(v) => setChartType(v as ChartType)}
                options={[
                  ["histogram", "Histogram"],
                  ["scatter", "Scatter Plot"],
                  ["bar", "Bar Chart"],
                  ["line", "Line Graph"],
                  ["box", "Box Plot"],
                ]}
              />

              <Input
                label="Chart title"
                value={chartTitle}
                onChange={setChartTitle}
                textInput
              />

              {(chartType === "histogram" || chartType === "box") && (
                <Select
                  label="Numeric variable"
                  value={xVar}
                  onChange={setXVar}
                  options={numericColumns.map((c): [string, string] => [c, c])}
                />
              )}

              {chartType === "scatter" && (
                <>
                  <Select
                    label="X variable"
                    value={xVar}
                    onChange={setXVar}
                    options={numericColumns.map((c): [string, string] => [c, c])}
                  />
                  <Select
                    label="Y variable"
                    value={yVar}
                    onChange={setYVar}
                    options={numericColumns.map((c): [string, string] => [c, c])}
                  />
                </>
              )}

              {chartType === "bar" && (
                <>
                  <Select
                    label="Category variable (X)"
                    value={xVar}
                    onChange={setXVar}
                    options={headers.map((c): [string, string] => [c, c])}
                  />
                  <Select
                    label="Aggregation"
                    value={aggregation}
                    onChange={(v) => setAggregation(v as AggregationType)}
                    options={[
                      ["count", "Count"],
                      ["sum", "Sum"],
                      ["mean", "Mean"],
                    ]}
                  />
                  {aggregation !== "count" && (
                    <Select
                      label="Numeric variable (Y)"
                      value={yVar}
                      onChange={setYVar}
                      options={numericColumns.map((c): [string, string] => [c, c])}
                    />
                  )}
                </>
              )}

              {chartType === "line" && (
                <>
                  <Select
                    label="X variable"
                    value={xVar}
                    onChange={setXVar}
                    options={headers.map((c): [string, string] => [c, c])}
                  />
                  <Select
                    label="Y variable"
                    value={yVar}
                    onChange={setYVar}
                    options={numericColumns.map((c): [string, string] => [c, c])}
                  />
                </>
              )}

              {chartType === "box" && (
                <Select
                  label="Grouping variable (optional)"
                  value={groupVar}
                  onChange={setGroupVar}
                  options={[
                    ["", "No grouping"],
                    ...headers.map((c): [string, string] => [c, c]),
                  ]}
                />
              )}

              {chartType === "histogram" && (
                <Input label="Number of bins (0 = auto)" value={bins} onChange={setBins} />
              )}
            </InputGrid>
          </SectionCard>

          <SectionCard title="Presentation-Ready Chart">
            <div
              ref={chartRef}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3
                style={{
                  textAlign: "center",
                  marginTop: 0,
                  marginBottom: 18,
                  fontSize: "1.25rem",
                }}
              >
                {chartTitle || "Dataset Visualization"}
              </h3>

              {chartType === "histogram" && chartData && (
                <div style={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData as HistogramDatum[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bin" angle={-20} textAnchor="end" height={80} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="#FFC000" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "scatter" && chartData && (
                <div style={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={xVar}
                        label={{ value: xVar, position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={yVar}
                        label={{ value: yVar, angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={chartData as ScatterDatum[]} fill="#0d6efd" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "bar" && chartData && (
                <div style={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData as BarDatum[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-20} textAnchor="end" height={80} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#FFC000" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "line" && chartData && (
                <div style={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData as LineDatum[]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="#0d6efd"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        name={yVar}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "box" && chartData && (
                <BoxPlotSVG data={chartData as BoxDatum[]} title={chartTitle || "Box Plot"} />
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <button onClick={downloadChartImage} style={primaryButtonStyle}>
                Download Chart Image
              </button>
            </div>
          </SectionCard>

          {mathematicalSection && (
            <SectionCard title={mathematicalSection.title}>
              <div style={{ lineHeight: 1.9 }}>
                {mathematicalSection.points.map((point, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: 12,
                      background: "#fcfcfc",
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <strong>{index + 1}.</strong> {point}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Interpretation and Exploratory Analysis Notes">
            <div style={{ lineHeight: 1.9 }}>
              {chartType === "histogram" && (
                <>
                  <p>
                    A histogram helps identify the <strong>shape of the distribution</strong>,
                    such as whether it is approximately symmetric, skewed, uniform, or multimodal.
                  </p>
                  <p>
                    It is useful for detecting <strong>concentration of observations</strong>,
                    possible <strong>gaps</strong>, and potential <strong>outliers</strong>.
                  </p>
                </>
              )}

              {chartType === "scatter" && (
                <>
                  <p>
                    A scatter plot helps examine the <strong>relationship between two quantitative variables</strong>.
                  </p>
                  <p>
                    It can reveal <strong>positive association</strong>, <strong>negative association</strong>,
                    <strong> non-linear patterns</strong>, clusters, and outliers.
                  </p>
                </>
              )}

              {chartType === "bar" && (
                <>
                  <p>
                    A bar chart helps compare values across categories. It is useful for identifying
                    the <strong>largest</strong>, <strong>smallest</strong>, and relatively similar groups.
                  </p>
                  <p>
                    It is especially helpful for <strong>frequency comparison</strong> and grouped summaries.
                  </p>
                </>
              )}

              {chartType === "line" && (
                <>
                  <p>
                    A line graph shows how a numeric variable changes across an ordered variable such as
                    time, sequence, or another meaningful progression.
                  </p>
                  <p>
                    It helps detect <strong>trends</strong>, <strong>growth</strong>, <strong>decline</strong>,
                    and <strong>fluctuation</strong>.
                  </p>
                </>
              )}

              {chartType === "box" && (
                <>
                  <p>
                    A box plot summarizes the distribution using the <strong>five-number summary</strong>:
                    minimum, first quartile, median, third quartile, and maximum.
                  </p>
                  <p>
                    It is useful for comparing <strong>center</strong>, <strong>spread</strong>,
                    <strong> skewness</strong>, and <strong>outliers</strong> across groups.
                  </p>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Preview of Uploaded Data">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.95rem",
                }}
              >
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        style={{
                          border: "1px solid #ddd",
                          padding: "10px",
                          background: "#f8f8f8",
                          textAlign: "left",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {headers.map((header) => (
                        <td
                          key={header}
                          style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                          }}
                        >
                          {String(row[header] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 24,
        background: "#fff",
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 16 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 16,
        background: "#fcfcfc",
      }}
    >
      <div style={{ color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  textInput = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textInput?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={textInput ? "text" : "number"}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map(([val, text]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: "1rem",
  background: "#fff",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#FFC000",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};