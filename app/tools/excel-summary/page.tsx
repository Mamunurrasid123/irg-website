"use client";

import { useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import {
  Bar,
  Bubble,
  Chart as ReactChart,
  Line,
  Pie,
  Radar,
  Scatter,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type RowValue = string | number | boolean | null | undefined;
type RowData = Record<string, RowValue>;

type SummaryRow = {
  column: string;
  count: number;
  missing: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
};

type FreqRow = {
  label: string;
  lower: number;
  upper: number;
  frequency: number;
  cumulative: number;
};

type ChartType =
  | "bar"
  | "pie"
  | "histogram"
  | "frequency"
  | "ogive"
  | "scatter"
  | "dot"
  | "area"
  | "combo"
  | "spline"
  | "box"
  | "bubble"
  | "radar"
  | "venn";

const palette = [
  "rgba(59,130,246,0.75)",
  "rgba(239,68,68,0.75)",
  "rgba(245,158,11,0.75)",
  "rgba(16,185,129,0.75)",
  "rgba(139,92,246,0.75)",
  "rgba(236,72,153,0.75)",
  "rgba(14,165,233,0.75)",
  "rgba(132,204,22,0.75)",
];

const borderPalette = [
  "rgba(59,130,246,1)",
  "rgba(239,68,68,1)",
  "rgba(245,158,11,1)",
  "rgba(16,185,129,1)",
  "rgba(139,92,246,1)",
  "rgba(236,72,153,1)",
  "rgba(14,165,233,1)",
  "rgba(132,204,22,1)",
];

function isMissing(v: unknown) {
  return v === null || v === undefined || v === "";
}

function isNumericValue(v: unknown) {
  if (isMissing(v)) return false;
  return !Number.isNaN(Number(v));
}

function mean(arr: number[]) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function stdDev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  if (m === null) return null;
  const variance =
    arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function formatNumber(v: number | null, d = 3) {
  if (v === null || Number.isNaN(v)) return "—";
  return v.toFixed(d);
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

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("text" in obj) return String(obj.text ?? "");
    if ("hyperlink" in obj) return String(obj.hyperlink ?? "");

    if ("formula" in obj) {
      if (obj.result !== undefined && obj.result !== null) {
        return String(obj.result);
      }
      return String(obj.formula ?? "");
    }

    return JSON.stringify(obj);
  }

  return String(value);
}

function normalizeMissingValue(value: RowValue): RowValue {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const cleaned = value.trim();
    const lowered = cleaned.toLowerCase();

    if (
      cleaned === "" ||
      lowered === "na" ||
      lowered === "n/a" ||
      lowered === "null" ||
      lowered === "undefined" ||
      lowered === "nan" ||
      lowered === "-"
    ) {
      return "";
    }

    return cleaned;
  }

  return value;
}

function standardizeColumnName(name: string, index: number) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  return cleaned || `Column ${index + 1}`;
}

function safeFileName(name: string) {
  return name.replace(/[^\w\-]+/g, "_").toLowerCase();
}

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getNumericValues(data: RowData[], column: string) {
  return data
    .map((row) => row[column])
    .filter((v) => isNumericValue(v))
    .map((v) => Number(v));
}

function getCategoryCounts(data: RowData[], column: string) {
  const map = new Map<string, number>();

  data.forEach((row) => {
    const raw = row[column];
    if (isMissing(raw)) return;
    const key = String(raw).trim();
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
}

function buildFrequency(values: number[], bins: number): FreqRow[] {
  if (!values.length || bins < 1) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        label: `${min.toFixed(2)} - ${max.toFixed(2)}`,
        lower: min,
        upper: max,
        frequency: values.length,
        cumulative: values.length,
      },
    ];
  }

  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);

  values.forEach((v) => {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  });

  let cumulative = 0;

  return counts.map((f, i) => {
    const lower = min + i * width;
    const upper = i === bins - 1 ? max : min + (i + 1) * width;
    cumulative += f;

    return {
      label: `${lower.toFixed(2)} - ${upper.toFixed(2)}`,
      lower,
      upper,
      frequency: f,
      cumulative,
    };
  });
}

function quartiles(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const q2 = median(s) ?? 0;
  const lowerHalf = s.slice(0, Math.floor(s.length / 2));
  const upperHalf = s.slice(Math.ceil(s.length / 2));

  return {
    min: s[0] ?? 0,
    q1: median(lowerHalf) ?? s[0] ?? 0,
    median: q2,
    q3: median(upperHalf) ?? s[s.length - 1] ?? 0,
    max: s[s.length - 1] ?? 0,
  };
}

function membershipValue(v: RowValue) {
  if (isMissing(v)) return false;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "y", "present"].includes(s) || s !== "0";
}

function getMode(values: RowValue[]) {
  const map = new Map<string, number>();

  values.forEach((v) => {
    if (isMissing(v)) return;
    const key = String(v);
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  let bestValue = "";
  let bestCount = -1;

  map.forEach((count, value) => {
    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  });

  return bestValue;
}

function cleanDataset(input: RowData[]) {
  if (!input.length) {
    return {
      cleaned: [],
      removedEmptyRows: 0,
      removedDuplicates: 0,
      filledNumericMissing: 0,
      filledCategoricalMissing: 0,
    };
  }

  const standardizedRows = input.map((row) => {
    const newRow: RowData = {};
    Object.entries(row).forEach(([key, value], index) => {
      const cleanKey = standardizeColumnName(key, index);
      newRow[cleanKey] = normalizeMissingValue(value);
    });
    return newRow;
  });

  const nonEmptyRows = standardizedRows.filter((row) =>
    Object.values(row).some((v) => !isMissing(v))
  );
  const removedEmptyRows = standardizedRows.length - nonEmptyRows.length;

  const uniqueRows: RowData[] = [];
  const seen = new Set<string>();

  nonEmptyRows.forEach((row) => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });

  const removedDuplicates = nonEmptyRows.length - uniqueRows.length;

  if (!uniqueRows.length) {
    return {
      cleaned: [],
      removedEmptyRows,
      removedDuplicates,
      filledNumericMissing: 0,
      filledCategoricalMissing: 0,
    };
  }

  const allColumns = Array.from(
    new Set(uniqueRows.flatMap((row) => Object.keys(row)))
  );

  const numericColumns = allColumns.filter((col) => {
    const values = uniqueRows.map((row) => row[col]).filter((v) => !isMissing(v));
    if (!values.length) return false;
    const numericCount = values.filter((v) => isNumericValue(v)).length;
    return numericCount / values.length >= 0.6;
  });

  const categoricalColumns = allColumns.filter((col) => !numericColumns.includes(col));

  const numericFillMap = new Map<string, number>();
  numericColumns.forEach((col) => {
    const nums = uniqueRows
      .map((row) => row[col])
      .filter((v) => isNumericValue(v))
      .map((v) => Number(v));
    numericFillMap.set(col, mean(nums) ?? 0);
  });

  const categoricalFillMap = new Map<string, string>();
  categoricalColumns.forEach((col) => {
    categoricalFillMap.set(col, getMode(uniqueRows.map((row) => row[col])));
  });

  let filledNumericMissing = 0;
  let filledCategoricalMissing = 0;

  const cleaned = uniqueRows.map((row) => {
    const newRow: RowData = {};

    allColumns.forEach((col) => {
      let value = row[col];

      if (numericColumns.includes(col)) {
        if (isMissing(value)) {
          value = numericFillMap.get(col) ?? 0;
          filledNumericMissing++;
        } else if (isNumericValue(value)) {
          value = Number(value);
        }
      } else {
        if (isMissing(value)) {
          value = categoricalFillMap.get(col) || "Unknown";
          filledCategoricalMissing++;
        } else {
          value = String(value).trim();
        }
      }

      newRow[col] = value;
    });

    return newRow;
  });

  return {
    cleaned,
    removedEmptyRows,
    removedDuplicates,
    filledNumericMissing,
    filledCategoricalMissing,
  };
}

function BoxPlotSvg({ values, label }: { values: number[]; label: string }) {
  if (!values.length) return <div>No numeric data available.</div>;

  const stats = quartiles(values);
  const width = 760;
  const height = 180;
  const pad = 60;
  const y = 90;

  const scale = (v: number) => {
    if (stats.max === stats.min) return width / 2;
    return pad + ((v - stats.min) / (stats.max - stats.min)) * (width - 2 * pad);
  };

  return (
    <div style={chartCardStyle}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ background: "#fff" }}>
        <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="#94a3b8" strokeWidth="2" />
        <line x1={scale(stats.min)} y1={y - 20} x2={scale(stats.min)} y2={y + 20} stroke="#111827" strokeWidth="2" />
        <line x1={scale(stats.max)} y1={y - 20} x2={scale(stats.max)} y2={y + 20} stroke="#111827" strokeWidth="2" />
        <line x1={scale(stats.min)} y1={y} x2={scale(stats.q1)} y2={y} stroke="#111827" strokeWidth="2" />
        <line x1={scale(stats.q3)} y1={y} x2={scale(stats.max)} y2={y} stroke="#111827" strokeWidth="2" />
        <rect
          x={scale(stats.q1)}
          y={y - 26}
          width={Math.max(2, scale(stats.q3) - scale(stats.q1))}
          height={52}
          fill="rgba(59,130,246,0.2)"
          stroke="rgba(59,130,246,1)"
          strokeWidth="2"
        />
        <line
          x1={scale(stats.median)}
          y1={y - 26}
          x2={scale(stats.median)}
          y2={y + 26}
          stroke="rgba(239,68,68,1)"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function VennSvg({
  counts,
  labels,
}: {
  counts: { A: number; B: number; C: number; AB: number; AC: number; BC: number; ABC: number };
  labels: [string, string, string];
}) {
  const onlyA = Math.max(0, counts.A - counts.AB - counts.AC + counts.ABC);
  const onlyB = Math.max(0, counts.B - counts.AB - counts.BC + counts.ABC);
  const onlyC = Math.max(0, counts.C - counts.AC - counts.BC + counts.ABC);
  const abOnly = Math.max(0, counts.AB - counts.ABC);
  const acOnly = Math.max(0, counts.AC - counts.ABC);
  const bcOnly = Math.max(0, counts.BC - counts.ABC);

  return (
    <div style={chartCardStyle}>
      <svg width="100%" viewBox="0 0 700 430" style={{ background: "#fff" }}>
        <circle cx="270" cy="190" r="115" fill="rgba(59,130,246,0.28)" stroke="rgba(59,130,246,1)" strokeWidth="3" />
        <circle cx="430" cy="190" r="115" fill="rgba(239,68,68,0.28)" stroke="rgba(239,68,68,1)" strokeWidth="3" />
        <circle cx="350" cy="300" r="115" fill="rgba(16,185,129,0.28)" stroke="rgba(16,185,129,1)" strokeWidth="3" />

        <text x="215" y="95" fontSize="18" fontWeight="700" fill="#1e3a8a">{labels[0]}</text>
        <text x="470" y="95" fontSize="18" fontWeight="700" fill="#991b1b">{labels[1]}</text>
        <text x="340" y="412" fontSize="18" fontWeight="700" fill="#065f46">{labels[2]}</text>

        <text x="220" y="190" fontSize="18" fontWeight="700" textAnchor="middle">{onlyA}</text>
        <text x="480" y="190" fontSize="18" fontWeight="700" textAnchor="middle">{onlyB}</text>
        <text x="350" y="345" fontSize="18" fontWeight="700" textAnchor="middle">{onlyC}</text>

        <text x="350" y="180" fontSize="18" fontWeight="700" textAnchor="middle">{abOnly}</text>
        <text x="300" y="255" fontSize="18" fontWeight="700" textAnchor="middle">{acOnly}</text>
        <text x="400" y="255" fontSize="18" fontWeight="700" textAnchor="middle">{bcOnly}</text>
        <text x="350" y="225" fontSize="20" fontWeight="800" textAnchor="middle">{counts.ABC}</text>
      </svg>
    </div>
  );
}

export default function ExcelSummaryPage() {
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [primaryColumn, setPrimaryColumn] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [sizeColumn, setSizeColumn] = useState("");
  const [vennA, setVennA] = useState("");
  const [vennB, setVennB] = useState("");
  const [vennC, setVennC] = useState("");
  const [bins, setBins] = useState(6);

  const chartRef = useRef<ChartJS | null>(null);

  const cleaningInfo = useMemo(() => cleanDataset(rawData), [rawData]);
  const data = cleaningInfo.cleaned;

  const columns = useMemo(() => {
    if (!data.length) return [];
    const set = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [data]);

  const numericColumns = useMemo(
    () => columns.filter((c) => data.some((row) => isNumericValue(row[c]))),
    [columns, data]
  );

  const categoricalColumns = useMemo(
    () => columns.filter((c) => !numericColumns.includes(c)),
    [columns, numericColumns]
  );

  const previewRows = useMemo(() => data.slice(0, 100000), [data]);

  const totalMissing = useMemo(() => {
    let m = 0;
    data.forEach((row) => columns.forEach((c) => isMissing(row[c]) && m++));
    return m;
  }, [data, columns]);

  const summaryRows: SummaryRow[] = useMemo(() => {
    return columns.map((c) => {
      const vals = data.map((row) => row[c]);
      const nums = vals.filter(isNumericValue).map(Number);

      return {
        column: c,
        count: nums.length,
        missing: vals.filter(isMissing).length,
        mean: nums.length ? mean(nums) : null,
        median: nums.length ? median(nums) : null,
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
        std: nums.length ? stdDev(nums) : null,
      };
    });
  }, [columns, data]);

  const selectedNumericValues = useMemo(
    () => (primaryColumn ? getNumericValues(data, primaryColumn) : []),
    [data, primaryColumn]
  );

  const freqRows = useMemo(
    () => buildFrequency(selectedNumericValues, bins),
    [selectedNumericValues, bins]
  );

  const vennCounts = useMemo(() => {
    if (!vennA || !vennB || !vennC) return null;

    let A = 0, B = 0, C = 0, AB = 0, AC = 0, BC = 0, ABC = 0;

    data.forEach((row) => {
      const a = membershipValue(row[vennA]);
      const b = membershipValue(row[vennB]);
      const c = membershipValue(row[vennC]);

      if (a) A++;
      if (b) B++;
      if (c) C++;
      if (a && b) AB++;
      if (a && c) AC++;
      if (b && c) BC++;
      if (a && b && c) ABC++;
    });

    return { A, B, C, AB, AC, BC, ABC };
  }, [data, vennA, vennB, vennC]);

  const handleExcelFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("No worksheet found.");

    const headers: string[] = [];
    const rows: RowData[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const rawValues = Array.isArray(row.values) ? row.values.slice(1) : [];

      if (rowNumber === 1) {
        rawValues.forEach((cell, i) => {
          const h = String(normalizeExcelValue(cell) ?? `Column ${i + 1}`).trim();
          headers.push(h || `Column ${i + 1}`);
        });
      } else {
        const obj: RowData = {};
        headers.forEach((h, i) => {
          obj[h] = normalizeExcelValue(rawValues[i]);
        });

        if (Object.values(obj).some((v) => !isMissing(v))) {
          rows.push(obj);
        }
      }
    });

    setRawData(rows);
  };

  const handleCsvFile = (file: File) => {
    Papa.parse<RowData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRawData(results.data || []);
        setLoading(false);
      },
      error: () => {
        setError("Failed to parse CSV file.");
        setLoading(false);
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);
    setRawData([]);
    setFileName(file.name);
    setPrimaryColumn("");
    setXColumn("");
    setYColumn("");
    setSizeColumn("");
    setVennA("");
    setVennB("");
    setVennC("");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        handleCsvFile(file);
        return;
      }

      if (ext === "xlsx") {
        await handleExcelFile(file);
        setLoading(false);
        return;
      }

      setError("Please upload a valid .xlsx or .csv file.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while reading the file.");
      setLoading(false);
    }
  };

  const downloadSummaryCsv = () => {
    const csv = Papa.unparse(summaryRows);
    downloadTextFile(
      csv,
      `${safeFileName(fileName || "dataset")}_summary.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const downloadCleanedCsv = () => {
    const csv = Papa.unparse(data);
    downloadTextFile(
      csv,
      `${safeFileName(fileName || "dataset")}_cleaned.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const downloadFrequencyCsv = () => {
    const csv = Papa.unparse(freqRows);
    downloadTextFile(
      csv,
      `${safeFileName(primaryColumn || "frequency")}_frequency.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const downloadChartPng = () => {
    const chart = chartRef.current as any;
    if (!chart?.toBase64Image) return;
    const url = chart.toBase64Image();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(chartType)}.png`;
    a.click();
  };

  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: "#111827", font: { size: 13, weight: 600 } },
      },
      title: {
        display: true,
        color: "#111827",
        font: { size: 16, weight: 700 },
      },
    },
  };

  const renderChart = () => {
    if (!data.length) return null;

    if (chartType === "bar") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn) : [];

      return rows.length ? (
        <div style={{ height: 420 }}>
          <Bar
            ref={chartRef as any}
            data={{
              labels: rows.map((r) => r[0]),
              datasets: [
                {
                  label: primaryColumn,
                  data: rows.map((r) => r[1]),
                  backgroundColor: rows.map((_, i) => palette[i % palette.length]),
                  borderColor: rows.map((_, i) => borderPalette[i % borderPalette.length]),
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Bar Chart: ${primaryColumn}` },
              },
              scales: {
                x: { ticks: { color: "#111827" } },
                y: { beginAtZero: true, min: 0, ticks: { color: "#111827" } },
              },
            }}
          />
        </div>
      ) : <div>Select a categorical column.</div>;
    }

    if (chartType === "pie") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn) : [];

      return rows.length ? (
        <div style={{ height: 420 }}>
          <Pie
            ref={chartRef as any}
            data={{
              labels: rows.map((r) => r[0]),
              datasets: [
                {
                  label: primaryColumn,
                  data: rows.map((r) => r[1]),
                  backgroundColor: rows.map((_, i) => palette[i % palette.length]),
                  borderColor: "#ffffff",
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Pie Chart: ${primaryColumn}` },
              },
            }}
          />
        </div>
      ) : <div>Select a categorical column.</div>;
    }

    if (chartType === "histogram" || chartType === "frequency") {
      return freqRows.length ? (
        <div style={{ height: 420 }}>
          <Bar
            ref={chartRef as any}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: chartType === "histogram" ? "Histogram" : "Frequency Distribution",
                  data: freqRows.map((r) => r.frequency),
                  backgroundColor: freqRows.map((_, i) => palette[i % palette.length]),
                  borderColor: freqRows.map((_, i) => borderPalette[i % borderPalette.length]),
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: `${chartType === "histogram" ? "Histogram" : "Frequency Distribution"}: ${primaryColumn}`,
                },
              },
              scales: {
                x: { ticks: { color: "#111827" } },
                y: { beginAtZero: true, min: 0, ticks: { color: "#111827" } },
              },
            }}
          />
        </div>
      ) : <div>Select a numeric column.</div>;
    }

    if (chartType === "ogive") {
      return freqRows.length ? (
        <div style={{ height: 420 }}>
          <Line
            ref={chartRef as any}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: "Cumulative Frequency",
                  data: freqRows.map((r) => r.cumulative),
                  borderColor: "rgba(59,130,246,1)",
                  backgroundColor: "rgba(59,130,246,0.15)",
                  pointBackgroundColor: "rgba(59,130,246,1)",
                  fill: true,
                  tension: 0.25,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Ogive: ${primaryColumn}` },
              },
              scales: {
                x: { ticks: { color: "#111827" } },
                y: { beginAtZero: true, min: 0, ticks: { color: "#111827" } },
              },
            }}
          />
        </div>
      ) : <div>Select a numeric column.</div>;
    }

    if (chartType === "scatter") {
      const points =
        xColumn && yColumn
          ? data
              .filter((r) => isNumericValue(r[xColumn]) && isNumericValue(r[yColumn]))
              .map((r) => ({
                x: Number(r[xColumn]),
                y: Number(r[yColumn]),
              }))
          : [];

      return points.length ? (
        <div style={{ height: 420 }}>
          <Scatter
            ref={chartRef as any}
            data={{
              datasets: [
                {
                  label: `${yColumn} vs ${xColumn}`,
                  data: points,
                  backgroundColor: "rgba(239,68,68,0.8)",
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Scatter Plot: ${yColumn} vs ${xColumn}` },
              },
              scales: {
                x: {
                  type: "linear",
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: xColumn, color: "#111827" },
                },
                y: {
                  type: "linear",
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: yColumn, color: "#111827" },
                },
              },
            }}
          />
        </div>
      ) : <div>Select two numeric columns.</div>;
    }

    if (chartType === "dot") {
      const vals = selectedNumericValues;
      const countMap = new Map<number, number>();
      vals.forEach((v) => countMap.set(v, (countMap.get(v) ?? 0) + 1));
      const points = Array.from(countMap.entries()).map(([x, y]) => ({ x, y }));

      return points.length ? (
        <div style={{ height: 420 }}>
          <Scatter
            ref={chartRef as any}
            data={{
              datasets: [
                {
                  label: `Dot Plot: ${primaryColumn}`,
                  data: points,
                  backgroundColor: "rgba(16,185,129,0.9)",
                  pointRadius: 6,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Dot Plot: ${primaryColumn}` },
              },
              scales: {
                x: {
                  type: "linear",
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: primaryColumn, color: "#111827" },
                },
                y: {
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: "Frequency", color: "#111827" },
                },
              },
            }}
          />
        </div>
      ) : <div>Select a numeric column.</div>;
    }

    if (chartType === "area" || chartType === "spline") {
      const vals = selectedNumericValues.slice(0, 40);

      return vals.length ? (
        <div style={{ height: 420 }}>
          <Line
            ref={chartRef as any}
            data={{
              labels: vals.map((_, i) => `Row ${i + 1}`),
              datasets: [
                {
                  label: primaryColumn,
                  data: vals,
                  borderColor: "rgba(59,130,246,1)",
                  backgroundColor:
                    chartType === "area"
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(239,68,68,0.15)",
                  fill: chartType === "area",
                  tension: chartType === "spline" ? 0.35 : 0,
                  pointBackgroundColor: "rgba(59,130,246,1)",
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: `${chartType === "area" ? "Area" : "Spline"} Chart: ${primaryColumn}`,
                },
              },
              scales: {
                x: { ticks: { color: "#111827" } },
                y: { beginAtZero: true, min: 0, ticks: { color: "#111827" } },
              },
            }}
          />
        </div>
      ) : <div>Select a numeric column.</div>;
    }

    if (chartType === "combo") {
      const vals = selectedNumericValues.slice(0, 20);

      const comboData = {
        labels: vals.map((_, i) => `Row ${i + 1}`),
        datasets: [
          {
            type: "bar" as const,
            label: `${primaryColumn} (Bar)`,
            data: vals,
            backgroundColor: "rgba(59,130,246,0.6)",
            borderColor: "rgba(59,130,246,1)",
            borderWidth: 2,
          },
          {
            type: "line" as const,
            label: `${primaryColumn} (Line)`,
            data: vals,
            borderColor: "rgba(239,68,68,1)",
            backgroundColor: "rgba(239,68,68,0.15)",
            tension: 0.25,
            fill: false,
          },
        ],
      };

      return vals.length ? (
        <div style={{ height: 420 }}>
          <ReactChart
            ref={chartRef as any}
            type="bar"
            data={comboData}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Combo Chart: ${primaryColumn}` },
              },
              scales: {
                x: { ticks: { color: "#111827" } },
                y: { beginAtZero: true, min: 0, ticks: { color: "#111827" } },
              },
            }}
          />
        </div>
      ) : <div>Select a numeric column.</div>;
    }

    if (chartType === "bubble") {
      const points =
        xColumn && yColumn && sizeColumn
          ? data
              .filter(
                (r) =>
                  isNumericValue(r[xColumn]) &&
                  isNumericValue(r[yColumn]) &&
                  isNumericValue(r[sizeColumn])
              )
              .slice(0, 60)
              .map((r) => ({
                x: Number(r[xColumn]),
                y: Number(r[yColumn]),
                r: Math.max(4, Math.min(20, Number(r[sizeColumn]) / 2)),
              }))
          : [];

      return points.length ? (
        <div style={{ height: 420 }}>
          <Bubble
            ref={chartRef as any}
            data={{
              datasets: [
                {
                  label: `${yColumn} vs ${xColumn} (size = ${sizeColumn})`,
                  data: points,
                  backgroundColor: "rgba(139,92,246,0.55)",
                  borderColor: "rgba(139,92,246,1)",
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: "Bubble Chart" },
              },
              scales: {
                x: {
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: xColumn, color: "#111827" },
                },
                y: {
                  min: 0,
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: yColumn, color: "#111827" },
                },
              },
            }}
          />
        </div>
      ) : <div>Select X, Y, and Size numeric columns.</div>;
    }

    if (chartType === "radar") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn).slice(0, 8) : [];

      return rows.length ? (
        <div style={{ height: 420 }}>
          <Radar
            ref={chartRef as any}
            data={{
              labels: rows.map((r) => r[0]),
              datasets: [
                {
                  label: primaryColumn,
                  data: rows.map((r) => r[1]),
                  borderColor: "rgba(59,130,246,1)",
                  backgroundColor: "rgba(59,130,246,0.25)",
                  pointBackgroundColor: borderPalette,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: { ...commonOptions.plugins.title, text: `Radar Chart: ${primaryColumn}` },
              },
              scales: {
                r: {
                  beginAtZero: true,
                  min: 0,
                  ticks: { color: "#111827" },
                  pointLabels: { color: "#111827" },
                },
              },
            }}
          />
        </div>
      ) : <div>Select a categorical column.</div>;
    }

    if (chartType === "box") {
      return <BoxPlotSvg values={selectedNumericValues} label={`Box and Whisker: ${primaryColumn}`} />;
    }

    if (chartType === "venn") {
      return vennCounts ? (
        <VennSvg counts={vennCounts} labels={[vennA, vennB, vennC]} />
      ) : (
        <div>Select three membership/binary columns for the Venn chart.</div>
      );
    }

    return null;
  };

  return (
    <main className="container" style={{ padding: "40px 18px", background: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 10 }}>
          Excel Summary Generator
        </h1>

        <p style={{ marginBottom: 22, color: "#374151", lineHeight: 1.7 }}>
          Upload an Excel or CSV dataset, clean it automatically, generate plots from the cleaned data, and download both the cleaned file and the plot.
        </p>

        <div style={cardStyle}>
          <label htmlFor="file-upload" style={buttonStyle}>
            Upload Excel / CSV
          </label>

          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {fileName && (
            <div style={{ marginTop: 12 }}>
              <strong>Selected file:</strong> {fileName}
            </div>
          )}

          {loading && <div style={{ marginTop: 12 }}>Processing file...</div>}
          {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}
        </div>

        {data.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                margin: "24px 0",
              }}
            >
              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Uploaded Rows</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[0] }}>
                  {rawData.length}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Cleaned Rows</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[1] }}>
                  {data.length}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Removed Empty Rows</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[2] }}>
                  {cleaningInfo.removedEmptyRows}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Removed Duplicates</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[3] }}>
                  {cleaningInfo.removedDuplicates}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Filled Numeric Missing</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[4] }}>
                  {cleaningInfo.filledNumericMissing}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Filled Categorical Missing</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: borderPalette[5] }}>
                  {cleaningInfo.filledCategoricalMissing}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <button onClick={downloadSummaryCsv} style={buttonStyle}>
                Download Summary CSV
              </button>

              <button onClick={downloadCleanedCsv} style={buttonStyle}>
                Download Cleaned Data CSV
              </button>

              {["histogram", "frequency", "ogive"].includes(chartType) && (
                <button onClick={downloadFrequencyCsv} style={buttonStyle}>
                  Download Frequency CSV
                </button>
              )}

              {!["box", "venn"].includes(chartType) && (
                <button onClick={downloadChartPng} style={buttonStyle}>
                  Download Plot PNG
                </button>
              )}
            </div>

            <section style={{ marginBottom: 26 }}>
              <h2 style={sectionTitle}>Chart Options</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  style={selectStyle}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="histogram">Histogram</option>
                  <option value="frequency">Frequency Distribution</option>
                  <option value="ogive">Ogive</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="dot">Dot Plot</option>
                  <option value="area">Area Chart</option>
                  <option value="combo">Combo Chart</option>
                  <option value="spline">Spline Chart</option>
                  <option value="box">Box and Whisker Chart</option>
                  <option value="bubble">Bubble Chart</option>
                  <option value="radar">Radar Chart</option>
                  <option value="venn">Venn Chart</option>
                </select>

                {["bar", "pie", "radar"].includes(chartType) && (
                  <select value={primaryColumn} onChange={(e) => setPrimaryColumn(e.target.value)} style={selectStyle}>
                    <option value="">Select categorical column</option>
                    {categoricalColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                {["histogram", "frequency", "ogive", "dot", "area", "combo", "spline", "box"].includes(chartType) && (
                  <select value={primaryColumn} onChange={(e) => setPrimaryColumn(e.target.value)} style={selectStyle}>
                    <option value="">Select numeric column</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                {["histogram", "frequency", "ogive"].includes(chartType) && (
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={bins}
                    onChange={(e) =>
                      setBins(Math.max(3, Math.min(20, Number(e.target.value) || 6)))
                    }
                    style={selectStyle}
                    placeholder="Bins"
                  />
                )}

                {chartType === "scatter" && (
                  <>
                    <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} style={selectStyle}>
                      <option value="">Select X</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} style={selectStyle}>
                      <option value="">Select Y</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </>
                )}

                {chartType === "bubble" && (
                  <>
                    <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} style={selectStyle}>
                      <option value="">Select X</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} style={selectStyle}>
                      <option value="">Select Y</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select value={sizeColumn} onChange={(e) => setSizeColumn(e.target.value)} style={selectStyle}>
                      <option value="">Select bubble size</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </>
                )}

                {chartType === "venn" && (
                  <>
                    <select value={vennA} onChange={(e) => setVennA(e.target.value)} style={selectStyle}>
                      <option value="">Select Set A column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select value={vennB} onChange={(e) => setVennB(e.target.value)} style={selectStyle}>
                      <option value="">Select Set B column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select value={vennC} onChange={(e) => setVennC(e.target.value)} style={selectStyle}>
                      <option value="">Select Set C column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              <div style={chartCardStyle}>{renderChart()}</div>
            </section>

            <section style={{ marginBottom: 24 }}>
              <h2 style={sectionTitle}>Cleaned Data Preview</h2>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} style={thStyle}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {columns.map((c) => (
                          <td key={c} style={tdStyle}>{String(row[c] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 style={sectionTitle}>Numeric Summary (Based on Cleaned Data)</h2>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {["Column", "Numeric Count", "Missing", "Mean", "Median", "Min", "Max", "Std. Dev."].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.column}>
                        <td style={tdStyle}>{r.column}</td>
                        <td style={tdStyle}>{r.count}</td>
                        <td style={tdStyle}>{r.missing}</td>
                        <td style={tdStyle}>{formatNumber(r.mean)}</td>
                        <td style={tdStyle}>{formatNumber(r.median)}</td>
                        <td style={tdStyle}>{formatNumber(r.min)}</td>
                        <td style={tdStyle}>{formatNumber(r.max)}</td>
                        <td style={tdStyle}>{formatNumber(r.std)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
};

const chartCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 800,
  marginBottom: 12,
  color: "#111827",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  minWidth: 220,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#111827",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
};