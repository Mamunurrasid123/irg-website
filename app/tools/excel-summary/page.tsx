"use client";

import React, { useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { Buffer } from "buffer";
import {
  Chart,
  Bar,
  Bubble,
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

if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
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

type DataSourceMode = "upload" | "manual";

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
  | "bubble"
  | "box"
  | "radar"
  | "venn"
  | "multiVariableLine"
  | "multiVariableBar"
  | "multiVariableScatter";

const MAX_MANUAL_COLUMNS = 10;

const palette = [
  "rgba(59,130,246,0.72)",
  "rgba(239,68,68,0.72)",
  "rgba(245,158,11,0.72)",
  "rgba(16,185,129,0.72)",
  "rgba(139,92,246,0.72)",
  "rgba(236,72,153,0.72)",
  "rgba(14,165,233,0.72)",
  "rgba(132,204,22,0.72)",
  "rgba(251,146,60,0.72)",
  "rgba(99,102,241,0.72)",
  "rgba(20,184,166,0.72)",
  "rgba(244,63,94,0.72)",
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
  "rgba(251,146,60,1)",
  "rgba(99,102,241,1)",
  "rgba(20,184,166,1)",
  "rgba(244,63,94,1)",
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
      if ("result" in obj && obj.result !== undefined && obj.result !== null) {
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

  return Array.from(map.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], undefined, { numeric: true });
  });
}

function buildValueFrequency(values: number[]): FreqRow[] {
  if (!values.length) return [];
  const map = new Map<number, number>();

  values.forEach((v) => {
    map.set(v, (map.get(v) ?? 0) + 1);
  });

  const sorted = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  let cumulative = 0;

  return sorted.map(([value, frequency]) => {
    cumulative += frequency;
    return {
      label: String(value),
      lower: value,
      upper: value,
      frequency,
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

function normalizeSeries(values: number[]) {
  if (!values.length) return [];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal === maxVal) return values.map(() => 50);
  return values.map((v) => ((v - minVal) / (maxVal - minVal)) * 100);
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
      cleaned: [] as RowData[],
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
      cleaned: [] as RowData[],
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

  const categoricalColumns = allColumns.filter(
    (col) => !numericColumns.includes(col)
  );

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
    categoricalFillMap.set(
      col,
      getMode(uniqueRows.map((row) => row[col])) || "Unknown"
    );
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

function BoxPlotSvg({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
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

  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>("upload");

  const [manualTableColumns, setManualTableColumns] = useState<string[]>([
    "ID",
    "Name",
    "Department",
  ]);

  const [manualTableRows, setManualTableRows] = useState<string[][]>([
    ["1", "Alice", "CSE"],
    ["2", "Bob", "EEE"],
    ["3", "Carol", "BBA"],
  ]);

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [primaryColumn, setPrimaryColumn] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [sizeColumn, setSizeColumn] = useState("");

  const [vennA, setVennA] = useState("");
  const [vennB, setVennB] = useState("");
  const [vennC, setVennC] = useState("");

  const [multiXColumn, setMultiXColumn] = useState("");
  const [multiDependentColumns, setMultiDependentColumns] = useState<string[]>([]);
  const [multiIndependentColumns, setMultiIndependentColumns] = useState<string[]>([]);
  const [normalizeMultiLines, setNormalizeMultiLines] = useState(true);

  const [chartTitle, setChartTitle] = useState("");
  const [chartSubtitle, setChartSubtitle] = useState("");
  const [xAxisLabel, setXAxisLabel] = useState("");
  const [yAxisLabel, setYAxisLabel] = useState("");
  const [secondaryYAxisLabel, setSecondaryYAxisLabel] = useState("");
  const [legendPosition, setLegendPosition] = useState<"top" | "bottom" | "left" | "right">("top");

  const chartRef = useRef<any>(null);

  const cleaningInfo = useMemo(() => cleanDataset(rawData), [rawData]);
  const data = cleaningInfo.cleaned;

  const columns = useMemo(() => {
    if (!data.length) return [];
    const set = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [data]);

  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      const values = data.map((row) => row[col]).filter((v) => !isMissing(v));
      if (!values.length) return false;
      const numericCount = values.filter((v) => isNumericValue(v)).length;
      return numericCount / values.length >= 0.6;
    });
  }, [columns, data]);

  const categoryLikeColumns = useMemo(() => {
    return columns.filter((col) => {
      const values = data
        .map((row) => row[col])
        .filter((v) => !isMissing(v))
        .map((v) => String(v).trim())
        .filter(Boolean);

      return values.length > 0;
    });
  }, [columns, data]);

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
    () => buildValueFrequency(selectedNumericValues),
    [selectedNumericValues]
  );

  const vennCounts = useMemo(() => {
    if (!vennA || !vennB || !vennC) return null;

    let A = 0;
    let B = 0;
    let C = 0;
    let AB = 0;
    let AC = 0;
    let BC = 0;
    let ABC = 0;

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

  const allSelectedMultiSeries = useMemo(() => {
    const seen = new Set<string>();
    return [...multiDependentColumns, ...multiIndependentColumns].filter((col) => {
      if (seen.has(col)) return false;
      seen.add(col);
      return true;
    });
  }, [multiDependentColumns, multiIndependentColumns]);

  const multiSeriesBase = useMemo(() => {
    if (!allSelectedMultiSeries.length) return null;

    const relevantCols = multiXColumn
      ? [multiXColumn, ...allSelectedMultiSeries]
      : [...allSelectedMultiSeries];

    const validRows = data.filter((row) =>
      relevantCols.every((col) => isNumericValue(row[col]))
    );

    if (!validRows.length) return null;

    const labels = multiXColumn
      ? validRows.map((row) => String(row[multiXColumn]))
      : validRows.map((_, index) => `Row ${index + 1}`);

    const xValues = multiXColumn
      ? validRows.map((row) => Number(row[multiXColumn]))
      : validRows.map((_, index) => index + 1);

    const series = allSelectedMultiSeries.map((col, index) => {
      const rawValues = validRows.map((row) => Number(row[col]));
      const values = normalizeMultiLines ? normalizeSeries(rawValues) : rawValues;
      const isDependent = multiDependentColumns.includes(col);

      return {
        column: col,
        values,
        rawValues,
        isDependent,
        color: borderPalette[index % borderPalette.length],
        background: palette[index % palette.length],
      };
    });

    return {
      labels,
      xValues,
      series,
      rowCount: validRows.length,
    };
  }, [
    allSelectedMultiSeries,
    data,
    multiDependentColumns,
    multiXColumn,
    normalizeMultiLines,
  ]);

  function resetChartSelections() {
    setPrimaryColumn("");
    setXColumn("");
    setYColumn("");
    setSizeColumn("");
    setVennA("");
    setVennB("");
    setVennC("");
    setMultiXColumn("");
    setMultiDependentColumns([]);
    setMultiIndependentColumns([]);
    setNormalizeMultiLines(true);
  }

  function buildRowsFromManualTable(
    cols: string[] = manualTableColumns,
    rows: string[][] = manualTableRows
  ) {
    const cleanCols = cols.map((col, index) => {
      const cleaned = col.trim();
      return cleaned || `Column ${index + 1}`;
    });

    const built: RowData[] = rows.map((row) => {
      const obj: RowData = {};
      cleanCols.forEach((col, colIndex) => {
        obj[col] = row[colIndex] ?? "";
      });
      return obj;
    });

    return built;
  }

  function loadManualTableData() {
    try {
      setError("");

      if (!manualTableColumns.length) {
        setError("Please add at least one column.");
        return;
      }

      const builtRows = buildRowsFromManualTable().filter((row) =>
        Object.values(row).some((value) => !isMissing(String(value ?? "").trim()))
      );

      if (!builtRows.length) {
        setError("Please enter at least one non-empty row.");
        return;
      }

      setRawData(builtRows);
      setFileName("manual_table_input.csv");
      resetChartSelections();
    } catch (err) {
      console.error(err);
      setError("Failed to load manual table data.");
    }
  }

  function updateManualHeader(index: number, value: string) {
    setManualTableColumns((prev) =>
      prev.map((col, i) => (i === index ? value : col))
    );
  }

  function updateManualCell(rowIndex: number, colIndex: number, value: string) {
    setManualTableRows((prev) =>
      prev.map((row, r) =>
        r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row
      )
    );
  }

  function addManualRow() {
    setError("");
    setManualTableRows((prev) => [
      ...prev,
      Array.from({ length: manualTableColumns.length }, () => ""),
    ]);
  }

  function removeManualRow(rowIndex: number) {
    setError("");
    setManualTableRows((prev) => prev.filter((_, i) => i !== rowIndex));
  }

  function addManualColumn() {
    if (manualTableColumns.length >= MAX_MANUAL_COLUMNS) {
      setError(`You can add a maximum of ${MAX_MANUAL_COLUMNS} columns.`);
      return;
    }

    setError("");
    const nextColumnNumber = manualTableColumns.length + 1;
    setManualTableColumns((prev) => [...prev, `Column ${nextColumnNumber}`]);
    setManualTableRows((prev) => prev.map((row) => [...row, ""]));
  }

  function removeManualColumn(colIndex: number) {
    if (manualTableColumns.length <= 1) {
      setError("At least one column is required.");
      return;
    }

    setError("");
    setManualTableColumns((prev) => prev.filter((_, i) => i !== colIndex));
    setManualTableRows((prev) =>
      prev.map((row) => row.filter((_, i) => i !== colIndex))
    );
  }

  function clearManualTable() {
    setError("");
    setManualTableColumns(["Column 1", "Column 2", "Column 3"]);
    setManualTableRows([
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ]);
  }

  async function handleExcelFile(file: File) {
    if (!file) throw new Error("No file selected.");

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") throw new Error("Only .xlsx Excel files are supported.");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer as any);
    } catch (loadError) {
      console.error("Excel load error:", loadError);
      throw new Error(
        "Failed to read this Excel file. Please upload a valid .xlsx file."
      );
    }

    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      throw new Error("No worksheet found in the uploaded Excel file.");
    }

    const worksheet = workbook.worksheets[0];
    const headers: string[] = [];
    const rows: RowData[] = [];

    worksheet.eachRow((row, rowNumber) => {
      const rawValues = Array.isArray(row.values) ? row.values.slice(1) : [];

      if (rowNumber === 1) {
        rawValues.forEach((cell, i) => {
          const header = String(normalizeExcelValue(cell) ?? `Column ${i + 1}`).trim();
          headers.push(header || `Column ${i + 1}`);
        });
      } else {
        const obj: RowData = {};
        headers.forEach((header, i) => {
          obj[header] = normalizeExcelValue(rawValues[i]);
        });

        if (Object.values(obj).some((v) => !isMissing(v))) {
          rows.push(obj);
        }
      }
    });

    if (!headers.length) {
      throw new Error("The Excel sheet does not contain a valid header row.");
    }

    setRawData(rows);
  }

  function handleCsvFile(file: File) {
    Papa.parse<RowData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRawData(results.data || []);
        setLoading(false);
      },
      error: (err) => {
        console.error(err);
        setError("Failed to parse CSV file.");
        setLoading(false);
      },
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);
    setRawData([]);
    setFileName(file.name);
    resetChartSelections();

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
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reading the file."
      );
      setLoading(false);
    }
  }

  function toggleFromList(
    col: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setList((prev) =>
      prev.includes(col) ? prev.filter((item) => item !== col) : [...prev, col]
    );
  }

  function downloadSummaryCsv() {
    const csv = Papa.unparse(summaryRows);
    downloadTextFile(
      csv,
      `${safeFileName(fileName || "dataset")}_summary.csv`,
      "text/csv;charset=utf-8;"
    );
  }

  function downloadCleanedCsv() {
    const csv = Papa.unparse(data);
    downloadTextFile(
      csv,
      `${safeFileName(fileName || "dataset")}_cleaned.csv`,
      "text/csv;charset=utf-8;"
    );
  }

  function downloadFrequencyCsv() {
    const csv = Papa.unparse(freqRows);
    downloadTextFile(
      csv,
      `${safeFileName(primaryColumn || "frequency")}_frequency.csv`,
      "text/csv;charset=utf-8;"
    );
  }

  function downloadChartPng() {
    const chart = chartRef.current;
    if (!chart?.toBase64Image) return;
    const url = chart.toBase64Image();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(chartType)}.png`;
    a.click();
  }

  function getResolvedTitle(defaultTitle: string) {
    return chartTitle.trim() || defaultTitle;
  }

  function getResolvedSubtitle(defaultSubtitle = "") {
    return chartSubtitle.trim() || defaultSubtitle;
  }

  function getResolvedXAxis(defaultLabel: string) {
    return xAxisLabel.trim() || defaultLabel;
  }

  function getResolvedYAxis(defaultLabel: string) {
    return yAxisLabel.trim() || defaultLabel;
  }

  function getResolvedSecondaryYAxis(defaultLabel: string) {
    return secondaryYAxisLabel.trim() || defaultLabel;
  }

  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: legendPosition,
        labels: { color: "#111827", font: { size: 13, weight: "600" } },
      },
      title: {
        display: true,
        color: "#111827",
        font: { size: 16, weight: "700" },
      },
      subtitle: {
        display: !!(chartSubtitle || "").trim(),
        text: getResolvedSubtitle(""),
        color: "#4b5563",
        font: { size: 12, weight: "500" },
      },
    },
  };

  function renderChart() {
    if (!data.length) return null;

    if (chartType === "bar") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn) : [];
      if (!rows.length) return <div>Select a categorical column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Bar
            ref={chartRef}
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
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Bar Chart: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: false },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  beginAtZero: true,
                  min: 0,
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis("Count"), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "pie") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn) : [];
      if (!rows.length) return <div>Select a categorical column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Pie
            ref={chartRef}
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
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Pie Chart: ${primaryColumn}`),
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "histogram" || chartType === "frequency") {
      if (!freqRows.length) return <div>Select a numeric column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Bar
            ref={chartRef}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: chartType === "histogram" ? "Frequency" : "Frequency Distribution",
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
                  text: getResolvedTitle(
                    chartType === "histogram"
                      ? `Histogram: ${primaryColumn}`
                      : `Frequency Distribution: ${primaryColumn}`
                  ),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: false },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis("Frequency"), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "ogive") {
      if (!freqRows.length) return <div>Select a numeric column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Line
            ref={chartRef}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: "Cumulative Frequency",
                  data: freqRows.map((r) => r.cumulative),
                  borderColor: borderPalette[0],
                  backgroundColor: "rgba(59,130,246,0.15)",
                  pointBackgroundColor: borderPalette[0],
                  fill: true,
                  tension: 0.25,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Ogive: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: false },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedYAxis("Cumulative Frequency"),
                    color: "#111827",
                  },
                },
              },
            }}
          />
        </div>
      );
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

      if (!points.length) return <div>Select two numeric columns.</div>;

      return (
        <div style={{ height: 440 }}>
          <Scatter
            ref={chartRef}
            data={{
              datasets: [
                {
                  label: `${yColumn} vs ${xColumn}`,
                  data: points,
                  backgroundColor: borderPalette[1],
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Scatter Plot: ${yColumn} vs ${xColumn}`),
                },
              },
              scales: {
                x: {
                  type: "linear",
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedXAxis(xColumn), color: "#111827" },
                },
                y: {
                  type: "linear",
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis(yColumn), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "dot") {
      const points =
        primaryColumn
          ? getNumericValues(data, primaryColumn).map((v) => ({ x: v, y: 1 }))
          : [];

      if (!points.length) return <div>Select one numeric column for the dot plot.</div>;

      return (
        <div style={{ height: 300 }}>
          <Scatter
            ref={chartRef}
            data={{
              datasets: [
                {
                  label: primaryColumn,
                  data: points,
                  pointRadius: 6,
                  backgroundColor: borderPalette[4],
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Dot Plot: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  type: "linear",
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  display: false,
                  min: 0.5,
                  max: 1.5,
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "area") {
      if (!freqRows.length) return <div>Select a numeric column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Line
            ref={chartRef}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: primaryColumn,
                  data: freqRows.map((r) => r.frequency),
                  borderColor: borderPalette[2],
                  backgroundColor: "rgba(245,158,11,0.20)",
                  fill: true,
                  tension: 0.25,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Area Chart: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: false },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis("Frequency"), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "spline") {
      if (!freqRows.length) return <div>Select a numeric column.</div>;

      return (
        <div style={{ height: 440 }}>
          <Line
            ref={chartRef}
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  label: primaryColumn,
                  data: freqRows.map((r) => r.frequency),
                  borderColor: borderPalette[3],
                  backgroundColor: "rgba(16,185,129,0.12)",
                  fill: false,
                  tension: 0.45,
                  pointRadius: 4,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Spline Chart: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: false },
                  title: { display: true, text: getResolvedXAxis(primaryColumn), color: "#111827" },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis("Frequency"), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "combo") {
      if (!freqRows.length) return <div>Select a numeric column.</div>;

      return (
        <div style={{ height: 460 }}>
          <Chart
            ref={chartRef}
            type="bar"
            data={{
              labels: freqRows.map((r) => r.label),
              datasets: [
                {
                  type: "bar",
                  label: "Frequency",
                  data: freqRows.map((r) => r.frequency),
                  backgroundColor: palette[0],
                  borderColor: borderPalette[0],
                  borderWidth: 1,
                  yAxisID: "y",
                },
                {
                  type: "line",
                  label: "Cumulative",
                  data: freqRows.map((r) => r.cumulative),
                  borderColor: borderPalette[1],
                  backgroundColor: palette[1],
                  borderWidth: 2,
                  yAxisID: "y1",
                  tension: 0.25,
                  fill: false,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(`Combo Chart: ${primaryColumn}`),
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: "#111827",
                    maxRotation: 90,
                    minRotation: 0,
                    autoSkip: false,
                  },
                  title: {
                    display: true,
                    text: getResolvedXAxis(primaryColumn),
                    color: "#111827",
                  },
                },
                y: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedYAxis("Frequency"),
                    color: "#111827",
                  },
                },
                y1: {
                  beginAtZero: true,
                  position: "right",
                  grid: { drawOnChartArea: false },
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedSecondaryYAxis("Cumulative Frequency"),
                    color: "#111827",
                  },
                },
              },
            }}
          />
        </div>
      );
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
              .map((r) => ({
                x: Number(r[xColumn]),
                y: Number(r[yColumn]),
                r: Math.max(4, Math.min(24, Number(r[sizeColumn]) / 2)),
              }))
          : [];

      if (!points.length) return <div>Select X, Y, and Size numeric columns.</div>;

      return (
        <div style={{ height: 440 }}>
          <Bubble
            ref={chartRef}
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
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle("Bubble Chart"),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedXAxis(xColumn), color: "#111827" },
                },
                y: {
                  ticks: { color: "#111827" },
                  title: { display: true, text: getResolvedYAxis(yColumn), color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "radar") {
      const rows = primaryColumn ? getCategoryCounts(data, primaryColumn) : [];
      if (!rows.length) return <div>Select a categorical column.</div>;

      return (
        <div style={{ height: 460 }}>
          <Radar
            ref={chartRef}
            data={{
              labels: rows.map((r) => r[0]),
              datasets: [
                {
                  label: primaryColumn,
                  data: rows.map((r) => r[1]),
                  backgroundColor: "rgba(59,130,246,0.18)",
                  borderColor: borderPalette[0],
                  pointBackgroundColor: borderPalette[0],
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
                  text: getResolvedTitle(`Radar Chart: ${primaryColumn}`),
                },
              },
              scales: {
                r: {
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  pointLabels: { color: "#111827" },
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "box") {
      return (
        <BoxPlotSvg
          values={selectedNumericValues}
          label={getResolvedTitle(`Box and Whisker: ${primaryColumn}`)}
        />
      );
    }

    if (chartType === "venn") {
      if (!vennCounts) {
        return <div>Select three membership/binary columns for the Venn chart.</div>;
      }
      return <VennSvg counts={vennCounts} labels={[vennA, vennB, vennC]} />;
    }

    if (chartType === "multiVariableLine") {
      if (!multiSeriesBase) {
        return <div>Select at least one dependent or independent numeric column.</div>;
      }

      return (
        <div style={{ height: 540 }}>
          <Line
            ref={chartRef}
            data={{
              labels: multiSeriesBase.labels,
              datasets: multiSeriesBase.series.map((s) => ({
                label: `${s.column}${s.isDependent ? "" : ""}`,
                data: s.values,
                borderColor: s.color,
                backgroundColor: s.background,
                borderWidth: s.isDependent ? 3 : 2,
                pointRadius: 3,
                tension: 0.28,
                fill: false,
                yAxisID: s.isDependent ? "y" : "y1",
              })),
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(
                    "Multiple Dependent and Independent Variable Line Graph"
                  ),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: true },
                  title: {
                    display: true,
                    text: getResolvedXAxis(multiXColumn || "Observation / Row"),
                    color: "#111827",
                  },
                },
                y: {
                  position: "left",
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedYAxis(
                      normalizeMultiLines ? "Dependent Variables (0–100)" : "Dependent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
                y1: {
                  position: "right",
                  grid: { drawOnChartArea: false },
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedSecondaryYAxis(
                      normalizeMultiLines ? "Independent Variables (0–100)" : "Independent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "multiVariableBar") {
      if (!multiSeriesBase) {
        return <div>Select at least one dependent or independent numeric column.</div>;
      }

      return (
        <div style={{ height: 540 }}>
          <Bar
            ref={chartRef}
            data={{
              labels: multiSeriesBase.labels,
              datasets: multiSeriesBase.series.map((s) => ({
                label: `${s.column}${s.isDependent ? " (Dependent)" : " (Independent)"}`,
                data: s.values,
                backgroundColor: s.background,
                borderColor: s.color,
                borderWidth: 2,
                yAxisID: s.isDependent ? "y" : "y1",
              })),
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(
                    "Multiple Dependent and Independent Variable Bar Graph"
                  ),
                },
              },
              scales: {
                x: {
                  ticks: { color: "#111827", maxRotation: 90, minRotation: 0, autoSkip: true },
                  title: {
                    display: true,
                    text: getResolvedXAxis(multiXColumn || "Observation / Row"),
                    color: "#111827",
                  },
                },
                y: {
                  position: "left",
                  beginAtZero: true,
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedYAxis(
                      normalizeMultiLines ? "Dependent Variables (0–100)" : "Dependent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
                y1: {
                  position: "right",
                  beginAtZero: true,
                  grid: { drawOnChartArea: false },
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedSecondaryYAxis(
                      normalizeMultiLines ? "Independent Variables (0–100)" : "Independent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
              },
            }}
          />
        </div>
      );
    }

    if (chartType === "multiVariableScatter") {
      if (!multiSeriesBase || !multiXColumn) {
        return <div>Select one numeric X-axis column and at least one Y-series column.</div>;
      }

      return (
        <div style={{ height: 540 }}>
          <Scatter
            ref={chartRef}
            data={{
              datasets: multiSeriesBase.series.map((s) => ({
                label: `${s.column}${s.isDependent ? " (Dependent)" : " (Independent)"}`,
                data: multiSeriesBase.xValues.map((x, i) => ({
                  x,
                  y: s.values[i],
                })),
                backgroundColor: s.color,
                yAxisID: s.isDependent ? "y" : "y1",
              })),
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  ...commonOptions.plugins.title,
                  text: getResolvedTitle(
                    "Multiple Dependent and Independent Variable Scatter Graph"
                  ),
                },
              },
              scales: {
                x: {
                  type: "linear",
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedXAxis(multiXColumn),
                    color: "#111827",
                  },
                },
                y: {
                  position: "left",
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedYAxis(
                      normalizeMultiLines ? "Dependent Variables (0–100)" : "Dependent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
                y1: {
                  position: "right",
                  grid: { drawOnChartArea: false },
                  ticks: { color: "#111827" },
                  title: {
                    display: true,
                    text: getResolvedSecondaryYAxis(
                      normalizeMultiLines ? "Independent Variables (0–100)" : "Independent Variables"
                    ),
                    color: "#111827",
                  },
                  ...(normalizeMultiLines ? { min: 0, max: 100 } : {}),
                },
              },
            }}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <main
      className="container"
      style={{ padding: "40px 18px", background: "#fff", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 10 }}>
          Excel Summary Generator
        </h1>

        <p style={{ marginBottom: 22, color: "#374151", lineHeight: 1.7 }}>
          Upload an Excel or CSV dataset, or enter manual data in table form,
          clean it automatically, generate many chart types, and download both
          the cleaned file and the plot.
        </p>

        <div style={cardStyle}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <button
              onClick={() => setDataSourceMode("upload")}
              style={{
                ...buttonStyle,
                background: dataSourceMode === "upload" ? "#111827" : "#ffffff",
                color: dataSourceMode === "upload" ? "#ffffff" : "#111827",
              }}
            >
              Excel / CSV Import
            </button>
            <button
              onClick={() => setDataSourceMode("manual")}
              style={{
                ...buttonStyle,
                background: dataSourceMode === "manual" ? "#111827" : "#ffffff",
                color: dataSourceMode === "manual" ? "#ffffff" : "#111827",
              }}
            >
              Manual Data Input
            </button>
          </div>

          {dataSourceMode === "upload" && (
            <>
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
            </>
          )}

          {dataSourceMode === "manual" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={addManualRow} style={buttonStyle}>
                  Add Row
                </button>

                <button onClick={addManualColumn} style={buttonStyle}>
                  Add Column
                </button>

                <button onClick={clearManualTable} style={buttonStyle}>
                  Clear Table
                </button>

                <button onClick={loadManualTableData} style={buttonStyle}>
                  Load Manual Table Data
                </button>

                <div style={{ color: "#374151", fontSize: 14 }}>
                  Columns: <strong>{manualTableColumns.length}</strong> / {MAX_MANUAL_COLUMNS}
                </div>

                <div style={{ color: "#374151", fontSize: 14 }}>
                  Rows: <strong>{manualTableRows.length}</strong>
                </div>
              </div>

              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      {manualTableColumns.map((col, colIndex) => (
                        <th key={colIndex} style={thStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                              value={col}
                              onChange={(e) => updateManualHeader(colIndex, e.target.value)}
                              placeholder={`Column ${colIndex + 1}`}
                              style={{
                                ...inputStyle,
                                minWidth: 140,
                              }}
                            />
                            <button
                              onClick={() => removeManualColumn(colIndex)}
                              style={smallButtonStyle}
                            >
                              Remove Column
                            </button>
                          </div>
                        </th>
                      ))}
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {manualTableRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td style={tdStyle}>{rowIndex + 1}</td>

                        {manualTableColumns.map((_, colIndex) => (
                          <td key={colIndex} style={tdStyle}>
                            <input
                              value={row[colIndex] ?? ""}
                              onChange={(e) =>
                                updateManualCell(rowIndex, colIndex, e.target.value)
                              }
                              style={{
                                ...inputStyle,
                                minWidth: 140,
                              }}
                            />
                          </td>
                        ))}

                        <td style={tdStyle}>
                          <button
                            onClick={() => removeManualRow(rowIndex)}
                            style={smallButtonStyle}
                          >
                            Remove Row
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {fileName && (
                <div>
                  <strong>Current dataset:</strong> {fileName}
                </div>
              )}

              {error && <div style={{ color: "crimson" }}>{error}</div>}
            </div>
          )}
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
                <div style={{ fontSize: 13, color: "#6b7280" }}>Uploaded / Input Rows</div>
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

              {["histogram", "frequency", "ogive", "area", "spline", "combo"].includes(chartType) && (
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

              <div style={multiPanelStyle}>
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
                    onChange={(e) => {
                      setChartType(e.target.value as ChartType);
                      resetChartSelections();
                    }}
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
                    <option value="bubble">Bubble Chart</option>
                    <option value="box">Box and Whisker Chart</option>
                    <option value="radar">Radar Chart</option>
                    <option value="venn">Venn Chart</option>
                    <option value="multiVariableLine">
                      Multi Dependent + Independent Line Graph
                    </option>
                    <option value="multiVariableBar">
                      Multi Dependent + Independent Bar Graph
                    </option>
                    <option value="multiVariableScatter">
                      Multi Dependent + Independent Scatter Graph
                    </option>
                  </select>

                  <input
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="Manual graph title"
                    style={inputStyle}
                  />

                  <input
                    value={chartSubtitle}
                    onChange={(e) => setChartSubtitle(e.target.value)}
                    placeholder="Manual graph subtitle (optional)"
                    style={inputStyle}
                  />

                  <input
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    placeholder="Manual X-axis label"
                    style={inputStyle}
                  />

                  <input
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                    placeholder="Manual Y-axis label"
                    style={inputStyle}
                  />

                  <input
                    value={secondaryYAxisLabel}
                    onChange={(e) => setSecondaryYAxisLabel(e.target.value)}
                    placeholder="Manual secondary Y-axis label"
                    style={inputStyle}
                  />

                  <select
                    value={legendPosition}
                    onChange={(e) =>
                      setLegendPosition(e.target.value as "top" | "bottom" | "left" | "right")
                    }
                    style={selectStyle}
                  >
                    <option value="top">Legend Top</option>
                    <option value="bottom">Legend Bottom</option>
                    <option value="left">Legend Left</option>
                    <option value="right">Legend Right</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {["bar", "pie", "radar"].includes(chartType) && (
                    <select
                      value={primaryColumn}
                      onChange={(e) => setPrimaryColumn(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Select categorical column</option>
                      {categoryLikeColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}

                  {["histogram", "frequency", "ogive", "box", "dot", "area", "combo", "spline"].includes(chartType) && (
                    <select
                      value={primaryColumn}
                      onChange={(e) => setPrimaryColumn(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Select numeric column</option>
                      {numericColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
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
              </div>

              {["multiVariableLine", "multiVariableBar", "multiVariableScatter"].includes(chartType) && (
                <div style={multiPanelStyle}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div style={multiSelectBoxStyle}>
                      <div style={{ fontWeight: 800, marginBottom: 10 }}>
                        X-axis column {chartType === "multiVariableScatter" ? "(required)" : "(optional)"}
                      </div>
                      <select
                        value={multiXColumn}
                        onChange={(e) => setMultiXColumn(e.target.value)}
                        style={{ ...selectStyle, minWidth: "100%" }}
                      >
                        <option value="">
                          {chartType === "multiVariableScatter" ? "Select numeric X-axis" : "Use row number"}
                        </option>
                        {numericColumns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div style={multiSelectBoxStyle}>
                      <div style={{ fontWeight: 800, marginBottom: 10 }}>
                        Dependent variable columns (select many)
                      </div>
                      <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                        {numericColumns
                          .filter((c) => c !== multiXColumn)
                          .map((c) => (
                            <label key={c} style={checkLabelStyle}>
                              <input
                                type="checkbox"
                                checked={multiDependentColumns.includes(c)}
                                onChange={() => toggleFromList(c, setMultiDependentColumns)}
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                      </div>
                    </div>

                    <div style={multiSelectBoxStyle}>
                      <div style={{ fontWeight: 800, marginBottom: 10 }}>
                        Independent variable columns (select many)
                      </div>
                      <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                        {numericColumns
                          .filter((c) => c !== multiXColumn)
                          .map((c) => (
                            <label key={c} style={checkLabelStyle}>
                              <input
                                type="checkbox"
                                checked={multiIndependentColumns.includes(c)}
                                onChange={() => toggleFromList(c, setMultiIndependentColumns)}
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 18,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <label style={checkLabelStyle}>
                      <input
                        type="checkbox"
                        checked={normalizeMultiLines}
                        onChange={(e) => setNormalizeMultiLines(e.target.checked)}
                      />
                      <span>Normalize selected series to 0–100</span>
                    </label>

                    <div style={{ color: "#374151", fontSize: 14 }}>
                      Selected series: <strong>{allSelectedMultiSeries.length}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, color: "#374151", fontSize: 14, lineHeight: 1.7 }}>
                    These charts allow <strong>multiple dependent</strong> and <strong>multiple independent</strong> variables in one graph.
                    Dependent series are plotted on the left Y-axis and independent series on the right Y-axis.
                  </div>
                </div>
              )}

              {["histogram", "frequency", "ogive", "area", "combo", "spline"].includes(chartType) && primaryColumn && (
                <div style={{ marginBottom: 10, color: "#374151", fontSize: 14 }}>
                  Total numeric rows used: <strong>{selectedNumericValues.length}</strong>
                </div>
              )}

              {["multiVariableLine", "multiVariableBar", "multiVariableScatter"].includes(chartType) && multiSeriesBase && (
                <div style={{ marginBottom: 10, color: "#374151", fontSize: 14 }}>
                  Valid rows used in multi-variable graph: <strong>{multiSeriesBase.rowCount}</strong>
                </div>
              )}

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
                    {data.map((row, i) => (
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

const smallButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  minWidth: 220,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  minWidth: 220,
  width: "100%",
};

const multiPanelStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  marginBottom: 14,
};

const multiSelectBoxStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  minWidth: 220,
};

const checkLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 14,
  color: "#111827",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  overflowY: "auto",
  maxHeight: 700,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
  width: "max-content",
  minWidth: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#111827",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
  whiteSpace: "nowrap",
};