"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Chart as ReactChart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
} from "chart.js";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale
);

type RowValue = string | number | boolean | null | undefined;
type RowData = Record<string, RowValue>;

type RegressionPoint = {
  x: number;
  y: number;
};

type SimpleRegressionResult = {
  intercept: number;
  slope: number;
  r2: number;
  n: number;
};

type MultiRegressionResult = {
  coefficients: number[];
  r2: number;
  n: number;
  predictors: string[];
};

type ManualSimpleRow = {
  x: string;
  y: string;
};

type ManualMultipleRow = {
  x1: string;
  x2: string;
  x3: string;
  y: string;
};

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

function formatNumber(v: number | null | undefined, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
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

function computeSimpleLinearRegression(
  points: RegressionPoint[]
): SimpleRegressionResult | null {
  const n = points.length;
  if (n < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const xMean = mean(xs);
  const yMean = mean(ys);

  if (xMean === null || yMean === null) return null;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;

  for (const p of points) {
    sxx += (p.x - xMean) ** 2;
    sxy += (p.x - xMean) * (p.y - yMean);
    syy += (p.y - yMean) ** 2;
  }

  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;

  let sse = 0;
  for (const p of points) {
    const yHat = intercept + slope * p.x;
    sse += (p.y - yHat) ** 2;
  }

  const r2 = syy === 0 ? 1 : Math.max(0, 1 - sse / syy);

  return { intercept, slope, r2, n };
}

function transposeMatrix(matrix: number[][]) {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function multiplyMatrices(a: number[][], b: number[][]) {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;
  const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

function multiplyMatrixVector(a: number[][], v: number[]) {
  return a.map((row) => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(augmented[r][i]) > Math.abs(augmented[pivotRow][i])) {
        pivotRow = r;
      }
    }

    if (Math.abs(augmented[pivotRow][i]) < 1e-12) return null;

    if (pivotRow !== i) {
      [augmented[i], augmented[pivotRow]] = [augmented[pivotRow], augmented[i]];
    }

    const pivot = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const factor = augmented[r][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[r][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  return augmented.map((row) => row.slice(n));
}

function computeMultipleRegression(
  rows: Array<{ y: number; xs: number[] }>,
  predictors: string[]
): MultiRegressionResult | null {
  const n = rows.length;
  const p = predictors.length;

  if (n < p + 1 || p < 1) return null;

  const X = rows.map((r) => [1, ...r.xs]);
  const y = rows.map((r) => r.y);

  const Xt = transposeMatrix(X);
  const XtX = multiplyMatrices(Xt, X);
  const XtXInv = invertMatrix(XtX);

  if (!XtXInv) return null;

  const Xty = multiplyMatrixVector(Xt, y);
  const coefficients = multiplyMatrixVector(XtXInv, Xty);

  const yMean = mean(y);
  if (yMean === null) return null;

  const yHat = X.map((row) =>
    row.reduce((sum, val, i) => sum + val * coefficients[i], 0)
  );

  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    ssRes += (y[i] - yHat[i]) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }

  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return {
    coefficients,
    r2,
    n,
    predictors,
  };
}

export default function RegressionToolPage() {
  const [inputMode, setInputMode] = useState<"upload" | "manual">("upload");
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [regressionMode, setRegressionMode] = useState<"simple" | "multiple">(
    "simple"
  );

  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [x1Column, setX1Column] = useState("");
  const [x2Column, setX2Column] = useState("");
  const [x3Column, setX3Column] = useState("");

  const [manualSimpleRows, setManualSimpleRows] = useState<ManualSimpleRow[]>([
    { x: "", y: "" },
    { x: "", y: "" },
    { x: "", y: "" },
  ]);

  const [manualMultipleRows, setManualMultipleRows] = useState<ManualMultipleRow[]>([
    { x1: "", x2: "", x3: "", y: "" },
    { x1: "", x2: "", x3: "", y: "" },
    { x1: "", x2: "", x3: "", y: "" },
  ]);

  const [chartTitle, setChartTitle] = useState("Regression Plot");
  const [xAxisLabel, setXAxisLabel] = useState("");
  const [yAxisLabel, setYAxisLabel] = useState("");
  const [legendObserved, setLegendObserved] = useState("Observed Data");
  const [legendLine, setLegendLine] = useState("Fitted Regression Line");
  const [residualTitle, setResidualTitle] = useState("Residual Plot");
  const [residualLegend, setResidualLegend] = useState("Residuals");

  const [predictX, setPredictX] = useState("");
  const [predictX1, setPredictX1] = useState("");
  const [predictX2, setPredictX2] = useState("");
  const [predictX3, setPredictX3] = useState("");

  const mainChartRef = useRef<any>(null);
  const residualChartRef = useRef<any>(null);

  const columns = useMemo(() => {
    if (!rawData.length) return [];
    const set = new Set<string>();
    rawData.forEach((row) => {
      Object.keys(row).forEach((key) => set.add(key));
    });
    return Array.from(set);
  }, [rawData]);

  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      const values = rawData.map((row) => row[col]).filter((v) => !isMissing(v));
      if (!values.length) return false;
      const numericCount = values.filter((v) => isNumericValue(v)).length;
      return numericCount / values.length >= 0.6;
    });
  }, [columns, rawData]);

  const simpleRegressionPoints = useMemo(() => {
    if (inputMode === "manual") {
      return manualSimpleRows
        .filter((row) => isNumericValue(row.x) && isNumericValue(row.y))
        .map((row) => ({
          x: Number(row.x),
          y: Number(row.y),
        }));
    }

    if (!xColumn || !yColumn) return [];
    return rawData
      .filter((row) => isNumericValue(row[xColumn]) && isNumericValue(row[yColumn]))
      .map((row) => ({
        x: Number(row[xColumn]),
        y: Number(row[yColumn]),
      }));
  }, [inputMode, manualSimpleRows, rawData, xColumn, yColumn]);

  const simpleRegressionResult = useMemo(
    () => computeSimpleLinearRegression(simpleRegressionPoints),
    [simpleRegressionPoints]
  );

  const simpleLinePoints = useMemo(() => {
    if (!simpleRegressionResult || !simpleRegressionPoints.length) return [];
    const xs = simpleRegressionPoints.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    return [
      {
        x: minX,
        y: simpleRegressionResult.intercept + simpleRegressionResult.slope * minX,
      },
      {
        x: maxX,
        y: simpleRegressionResult.intercept + simpleRegressionResult.slope * maxX,
      },
    ];
  }, [simpleRegressionResult, simpleRegressionPoints]);

  const simpleResidualPoints = useMemo(() => {
    if (!simpleRegressionResult || !simpleRegressionPoints.length) return [];
    return simpleRegressionPoints.map((p) => ({
      x: p.x,
      y: p.y - (simpleRegressionResult.intercept + simpleRegressionResult.slope * p.x),
    }));
  }, [simpleRegressionResult, simpleRegressionPoints]);

  const multiplePredictors = useMemo(() => {
    if (inputMode === "manual") {
      return ["X₁", "X₂", "X₃"];
    }
    return [x1Column, x2Column, x3Column].filter(Boolean);
  }, [inputMode, x1Column, x2Column, x3Column]);

  const multipleRegressionRows = useMemo(() => {
    if (inputMode === "manual") {
      return manualMultipleRows
        .filter(
          (row) =>
            isNumericValue(row.y) &&
            isNumericValue(row.x1) &&
            isNumericValue(row.x2) &&
            isNumericValue(row.x3)
        )
        .map((row) => ({
          y: Number(row.y),
          xs: [Number(row.x1), Number(row.x2), Number(row.x3)],
        }));
    }

    if (!yColumn || multiplePredictors.length === 0) return [];
    return rawData
      .filter((row) => {
        if (!isNumericValue(row[yColumn])) return false;
        return multiplePredictors.every((p) => isNumericValue(row[p]));
      })
      .map((row) => ({
        y: Number(row[yColumn]),
        xs: multiplePredictors.map((p) => Number(row[p])),
      }));
  }, [inputMode, manualMultipleRows, rawData, yColumn, multiplePredictors]);

  const multipleRegressionResult = useMemo(
    () => computeMultipleRegression(multipleRegressionRows, multiplePredictors),
    [multipleRegressionRows, multiplePredictors]
  );

  const multipleObservedVsPredictedPoints = useMemo(() => {
    if (!multipleRegressionResult || !multipleRegressionRows.length) return [];
    return multipleRegressionRows.map((row) => {
      const predicted = [1, ...row.xs].reduce(
        (sum, val, i) => sum + val * multipleRegressionResult.coefficients[i],
        0
      );
      return {
        x: predicted,
        y: row.y,
      };
    });
  }, [multipleRegressionResult, multipleRegressionRows]);

  const multipleLinePoints = useMemo(() => {
    if (!multipleObservedVsPredictedPoints.length) return [];
    const xs = multipleObservedVsPredictedPoints.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return [
      { x: minX, y: minX },
      { x: maxX, y: maxX },
    ];
  }, [multipleObservedVsPredictedPoints]);

  const multipleResidualPoints = useMemo(() => {
    if (!multipleRegressionResult || !multipleRegressionRows.length) return [];
    return multipleRegressionRows.map((row, idx) => {
      const predicted = [1, ...row.xs].reduce(
        (sum, val, i) => sum + val * multipleRegressionResult.coefficients[i],
        0
      );
      return {
        x: idx + 1,
        y: row.y - predicted,
      };
    });
  }, [multipleRegressionResult, multipleRegressionRows]);

  const simplePrediction = useMemo(() => {
    if (!simpleRegressionResult || !isNumericValue(predictX)) return null;
    return simpleRegressionResult.intercept + simpleRegressionResult.slope * Number(predictX);
  }, [simpleRegressionResult, predictX]);

  const multiplePrediction = useMemo(() => {
    if (
      !multipleRegressionResult ||
      !isNumericValue(predictX1) ||
      !isNumericValue(predictX2) ||
      !isNumericValue(predictX3)
    ) {
      return null;
    }

    const xs = [Number(predictX1), Number(predictX2), Number(predictX3)];
    return [1, ...xs].reduce(
      (sum, val, i) => sum + val * multipleRegressionResult.coefficients[i],
      0
    );
  }, [multipleRegressionResult, predictX1, predictX2, predictX3]);

  const currentMainChartData = useMemo(() => {
    if (regressionMode === "simple") {
      return {
        datasets: [
          {
            type: "scatter" as const,
            label: legendObserved,
            data: simpleRegressionPoints,
            backgroundColor: "rgba(59,130,246,0.75)",
            pointRadius: 4,
            pointHoverRadius: 5,
          },
          {
            type: "line" as const,
            label: legendLine,
            data: simpleLinePoints,
            borderColor: "rgba(239,68,68,1)",
            backgroundColor: "rgba(239,68,68,0.12)",
            pointRadius: 0,
            borderWidth: 3,
            showLine: true,
            tension: 0,
          },
        ],
      };
    }

    return {
      datasets: [
        {
          type: "scatter" as const,
          label: legendObserved,
          data: multipleObservedVsPredictedPoints,
          backgroundColor: "rgba(59,130,246,0.75)",
          pointRadius: 4,
          pointHoverRadius: 5,
        },
        {
          type: "line" as const,
          label: legendLine,
          data: multipleLinePoints,
          borderColor: "rgba(239,68,68,1)",
          backgroundColor: "rgba(239,68,68,0.12)",
          pointRadius: 0,
          borderWidth: 3,
          showLine: true,
          tension: 0,
        },
      ],
    };
  }, [
    regressionMode,
    legendObserved,
    legendLine,
    simpleRegressionPoints,
    simpleLinePoints,
    multipleObservedVsPredictedPoints,
    multipleLinePoints,
  ]);

  const currentResidualChartData = useMemo(() => {
    const points =
      regressionMode === "simple" ? simpleResidualPoints : multipleResidualPoints;

    return {
      datasets: [
        {
          type: "scatter" as const,
          label: residualLegend,
          data: points,
          backgroundColor: "rgba(16,185,129,0.8)",
          pointRadius: 4,
          pointHoverRadius: 5,
        },
        {
          type: "line" as const,
          label: "Zero Line",
          data:
            points.length > 0
              ? [
                  { x: Math.min(...points.map((p) => p.x)), y: 0 },
                  { x: Math.max(...points.map((p) => p.x)), y: 0 },
                ]
              : [],
          borderColor: "rgba(107,114,128,1)",
          borderDash: [6, 6],
          pointRadius: 0,
          borderWidth: 2,
          showLine: true,
        },
      ],
    };
  }, [
    regressionMode,
    simpleResidualPoints,
    multipleResidualPoints,
    residualLegend,
  ]);

  const currentResult =
    regressionMode === "simple" ? simpleRegressionResult : multipleRegressionResult;

  const currentN =
    regressionMode === "simple"
      ? simpleRegressionResult?.n ?? 0
      : multipleRegressionResult?.n ?? 0;

  const currentMainTitle =
    chartTitle ||
    (regressionMode === "simple"
      ? "Regression Plot"
      : "Multiple Regression Plot");

  const currentXAxis =
    xAxisLabel ||
    (regressionMode === "simple"
      ? inputMode === "manual"
        ? "X"
        : xColumn || "X"
      : "Predicted Values");

  const currentYAxis =
    yAxisLabel ||
    (regressionMode === "simple"
      ? inputMode === "manual"
        ? "Y"
        : yColumn || "Y"
      : `Observed ${inputMode === "manual" ? "Y" : yColumn || "Y"}`);

  const residualXAxis =
    regressionMode === "simple"
      ? inputMode === "manual"
        ? "X"
        : xColumn || "X"
      : "Observation Index";

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
          const header = String(
            normalizeExcelValue(cell) ?? `Column ${i + 1}`
          ).trim();
          headers.push(standardizeColumnName(header, i));
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

    setRawData(rows);
  };

  const handleCsvFile = (file: File) => {
    Papa.parse<RowData>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || []).map((row) => {
          const newRow: RowData = {};
          Object.entries(row).forEach(([key, value], index) => {
            newRow[standardizeColumnName(key, index)] = value;
          });
          return newRow;
        });
        setRawData(rows);
        setLoading(false);
      },
      error: () => {
        setError("Failed to parse CSV file.");
        setLoading(false);
      },
    });
  };

  const resetSelections = () => {
    setXColumn("");
    setYColumn("");
    setX1Column("");
    setX2Column("");
    setX3Column("");
    setPredictX("");
    setPredictX1("");
    setPredictX2("");
    setPredictX3("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setRawData([]);
    setFileName(file.name);
    resetSelections();

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

  const addManualSimpleRow = () => {
    setManualSimpleRows((prev) => [...prev, { x: "", y: "" }]);
  };

  const addManualMultipleRow = () => {
    setManualMultipleRows((prev) => [...prev, { x1: "", x2: "", x3: "", y: "" }]);
  };

  const updateManualSimpleRow = (
    index: number,
    field: keyof ManualSimpleRow,
    value: string
  ) => {
    setManualSimpleRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const updateManualMultipleRow = (
    index: number,
    field: keyof ManualMultipleRow,
    value: string
  ) => {
    setManualMultipleRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeManualSimpleRow = (index: number) => {
    setManualSimpleRows((prev) => prev.filter((_, i) => i !== index));
  };

  const removeManualMultipleRow = (index: number) => {
    setManualMultipleRows((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadRegressionCsv = () => {
    if (!currentResult) return;

    if (regressionMode === "simple") {
      const rows = simpleRegressionPoints.map((p, i) => {
        const predicted =
          simpleRegressionResult!.intercept + simpleRegressionResult!.slope * p.x;
        return {
          Row: i + 1,
          X: p.x,
          Y: p.y,
          PredictedY: predicted,
          Residual: p.y - predicted,
        };
      });

      const csv = Papa.unparse(rows);
      downloadTextFile(
        csv,
        `${safeFileName(fileName || "manual")}_simple_regression.csv`,
        "text/csv;charset=utf-8;"
      );
      return;
    }

    const rows = multipleRegressionRows.map((row, idx) => {
      const predicted = [1, ...row.xs].reduce(
        (sum, val, i) => sum + val * multipleRegressionResult!.coefficients[i],
        0
      );

      return {
        Row: idx + 1,
        X1: row.xs[0],
        X2: row.xs[1],
        X3: row.xs[2],
        Y: row.y,
        PredictedY: predicted,
        Residual: row.y - predicted,
      };
    });

    const csv = Papa.unparse(rows);
    downloadTextFile(
      csv,
      `${safeFileName(fileName || "manual")}_multiple_regression.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const downloadChartPng = (ref: React.RefObject<any>, filename: string) => {
    const chart = ref.current;
    const actualChart = chart?.chartInstance || chart;
    if (!actualChart?.toBase64Image) return;
    const url = actualChart.toBase64Image("image/png", 1);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const mainChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#111827",
          font: { size: 13, weight: 700 },
          usePointStyle: true,
          boxWidth: 12,
        },
      },
      title: {
        display: true,
        text: currentMainTitle,
        color: "#111827",
        font: { size: 18, weight: 800 },
        padding: { top: 8, bottom: 16 },
      },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.92)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(209,213,219,0.6)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        type: "linear",
        grid: { color: "rgba(226,232,240,0.9)" },
        border: { color: "#94a3b8" },
        ticks: { color: "#111827" },
        title: {
          display: true,
          text: currentXAxis,
          color: "#111827",
          font: { size: 14, weight: 700 },
        },
      },
      y: {
        type: "linear",
        grid: { color: "rgba(226,232,240,0.9)" },
        border: { color: "#94a3b8" },
        ticks: { color: "#111827" },
        title: {
          display: true,
          text: currentYAxis,
          color: "#111827",
          font: { size: 14, weight: 700 },
        },
      },
    },
  };

  const residualChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#111827",
          font: { size: 13, weight: 700 },
          usePointStyle: true,
          boxWidth: 12,
        },
      },
      title: {
        display: true,
        text: residualTitle,
        color: "#111827",
        font: { size: 18, weight: 800 },
        padding: { top: 8, bottom: 16 },
      },
    },
    scales: {
      x: {
        type: "linear",
        grid: { color: "rgba(226,232,240,0.9)" },
        border: { color: "#94a3b8" },
        ticks: { color: "#111827" },
        title: {
          display: true,
          text: residualXAxis,
          color: "#111827",
          font: { size: 14, weight: 700 },
        },
      },
      y: {
        type: "linear",
        grid: { color: "rgba(226,232,240,0.9)" },
        border: { color: "#94a3b8" },
        ticks: { color: "#111827" },
        title: {
          display: true,
          text: "Residual",
          color: "#111827",
          font: { size: 14, weight: 700 },
        },
      },
    },
  };

  const simpleEquation =
    simpleRegressionResult
      ? `Y = ${formatNumber(simpleRegressionResult.intercept)} + ${formatNumber(
          simpleRegressionResult.slope
        )} × X`
      : "";

  const multipleEquation =
    multipleRegressionResult
      ? `Y = ${multipleRegressionResult.coefficients
          .map((coef, i) =>
            i === 0 ? formatNumber(coef) : `${formatNumber(coef)} × X${i}`
          )
          .join(" + ")}`
      : "";

  const canShowMainPlot =
    regressionMode === "simple"
      ? !!simpleRegressionResult
      : !!multipleRegressionResult;

  const canShowResidualPlot =
    regressionMode === "simple"
      ? simpleResidualPoints.length > 0
      : multipleResidualPoints.length > 0;

  return (
    <main
      className="container"
      style={{ padding: "40px 18px", background: "#fff", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 10 }}>
          Regression Tool
        </h1>

        <p style={{ marginBottom: 22, color: "#374151", lineHeight: 1.7 }}>
          Run regression analysis from uploaded Excel/CSV files or manual data entry.
          You can also enter predictor values to generate predictions.
        </p>

        <section style={{ marginBottom: 24 }}>
          <h2 style={sectionTitle}>Input Mode</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => setInputMode("upload")}
              style={{
                ...buttonStyle,
                background: inputMode === "upload" ? "#111827" : "#ffffff",
                color: inputMode === "upload" ? "#ffffff" : "#111827",
              }}
            >
              Excel / CSV Upload
            </button>

            <button
              onClick={() => {
                setInputMode("manual");
                setRawData([]);
                setFileName("");
                resetSelections();
              }}
              style={{
                ...buttonStyle,
                background: inputMode === "manual" ? "#111827" : "#ffffff",
                color: inputMode === "manual" ? "#ffffff" : "#111827",
              }}
            >
              Manual Data Entry
            </button>
          </div>
        </section>

        {inputMode === "upload" && (
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
        )}

        <section style={{ marginTop: 24 }}>
          <h2 style={sectionTitle}>Regression Type</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => setRegressionMode("simple")}
              style={{
                ...buttonStyle,
                background: regressionMode === "simple" ? "#111827" : "#ffffff",
                color: regressionMode === "simple" ? "#ffffff" : "#111827",
              }}
            >
              Simple Linear Regression
            </button>

            <button
              onClick={() => setRegressionMode("multiple")}
              style={{
                ...buttonStyle,
                background: regressionMode === "multiple" ? "#111827" : "#ffffff",
                color: regressionMode === "multiple" ? "#ffffff" : "#111827",
              }}
            >
              Multiple Regression (X₁, X₂, X₃)
            </button>
          </div>
        </section>

        {inputMode === "manual" && regressionMode === "simple" && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Manual X, Y Data Entry</h2>
            <div style={cardStyle}>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Row</th>
                      <th style={thStyle}>X</th>
                      <th style={thStyle}>Y</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualSimpleRows.map((row, index) => (
                      <tr key={index}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>
                          <input
                            value={row.x}
                            onChange={(e) =>
                              updateManualSimpleRow(index, "x", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            value={row.y}
                            onChange={(e) =>
                              updateManualSimpleRow(index, "y", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => removeManualSimpleRow(index)}
                            style={smallButtonStyle}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 14 }}>
                <button onClick={addManualSimpleRow} style={buttonStyle}>
                  Add Row
                </button>
              </div>
            </div>
          </section>
        )}

        {inputMode === "manual" && regressionMode === "multiple" && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Manual X₁, X₂, X₃, Y Data Entry</h2>
            <div style={cardStyle}>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Row</th>
                      <th style={thStyle}>X₁</th>
                      <th style={thStyle}>X₂</th>
                      <th style={thStyle}>X₃</th>
                      <th style={thStyle}>Y</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualMultipleRows.map((row, index) => (
                      <tr key={index}>
                        <td style={tdStyle}>{index + 1}</td>
                        <td style={tdStyle}>
                          <input
                            value={row.x1}
                            onChange={(e) =>
                              updateManualMultipleRow(index, "x1", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            value={row.x2}
                            onChange={(e) =>
                              updateManualMultipleRow(index, "x2", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            value={row.x3}
                            onChange={(e) =>
                              updateManualMultipleRow(index, "x3", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input
                            value={row.y}
                            onChange={(e) =>
                              updateManualMultipleRow(index, "y", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => removeManualMultipleRow(index)}
                            style={smallButtonStyle}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 14 }}>
                <button onClick={addManualMultipleRow} style={buttonStyle}>
                  Add Row
                </button>
              </div>
            </div>
          </section>
        )}

        {inputMode === "upload" && rawData.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Variable Selection</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select dependent variable (Y)</option>
                {numericColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {regressionMode === "simple" ? (
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select independent variable (X)</option>
                  {numericColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <select
                    value={x1Column}
                    onChange={(e) => setX1Column(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select X₁</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={x2Column}
                    onChange={(e) => setX2Column(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select X₂</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={x3Column}
                    onChange={(e) => setX3Column(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select X₃</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </section>
        )}

        {(inputMode === "manual" || rawData.length > 0) && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Prediction Input</h2>
            <div style={cardStyle}>
              {regressionMode === "simple" ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <input
                      placeholder="Enter X value for prediction"
                      value={predictX}
                      onChange={(e) => setPredictX(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginTop: 14, fontSize: 16 }}>
                    <strong>Predicted Y:</strong> {formatNumber(simplePrediction)}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <input
                      placeholder="Enter X₁"
                      value={predictX1}
                      onChange={(e) => setPredictX1(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Enter X₂"
                      value={predictX2}
                      onChange={(e) => setPredictX2(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Enter X₃"
                      value={predictX3}
                      onChange={(e) => setPredictX3(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginTop: 14, fontSize: 16 }}>
                    <strong>Predicted Y:</strong> {formatNumber(multiplePrediction)}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {(inputMode === "manual" || rawData.length > 0) && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Chart Customization</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <input
                placeholder="Main Chart Title"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="X Axis Label"
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Y Axis Label"
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Observed Data Legend"
                value={legendObserved}
                onChange={(e) => setLegendObserved(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Regression Line Legend"
                value={legendLine}
                onChange={(e) => setLegendLine(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Residual Plot Title"
                value={residualTitle}
                onChange={(e) => setResidualTitle(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Residual Legend"
                value={residualLegend}
                onChange={(e) => setResidualLegend(e.target.value)}
                style={inputStyle}
              />
            </div>
          </section>
        )}

        {(inputMode === "manual" || rawData.length > 0) && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={sectionTitle}>Regression Results</h2>

            {regressionMode === "simple" && !simpleRegressionResult ? (
              <div style={cardStyle}>
                Enter at least 2 valid numeric data points for simple regression.
              </div>
            ) : regressionMode === "multiple" && !multipleRegressionResult ? (
              <div style={cardStyle}>
                Enter enough valid numeric data for X₁, X₂, X₃, and Y to run multiple regression.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div style={statCardStyle}>
                    <div style={labelStyle}>Observations Used</div>
                    <div style={valueStyle}>{currentN}</div>
                  </div>

                  {regressionMode === "simple" && simpleRegressionResult && (
                    <>
                      <div style={statCardStyle}>
                        <div style={labelStyle}>Intercept</div>
                        <div style={valueStyle}>
                          {formatNumber(simpleRegressionResult.intercept)}
                        </div>
                      </div>

                      <div style={statCardStyle}>
                        <div style={labelStyle}>Slope</div>
                        <div style={valueStyle}>
                          {formatNumber(simpleRegressionResult.slope)}
                        </div>
                      </div>
                    </>
                  )}

                  <div style={statCardStyle}>
                    <div style={labelStyle}>R²</div>
                    <div style={valueStyle}>
                      {formatNumber(
                        regressionMode === "simple"
                          ? simpleRegressionResult?.r2
                          : multipleRegressionResult?.r2
                      )}
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                    Fitted Equation
                  </div>
                  <div style={equationStyle}>
                    {regressionMode === "simple" ? simpleEquation : multipleEquation}
                  </div>

                  {regressionMode === "multiple" && multipleRegressionResult && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                        Regression Coefficients
                      </div>
                      <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Term</th>
                              <th style={thStyle}>Coefficient</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={tdStyle}>Intercept</td>
                              <td style={tdStyle}>
                                {formatNumber(multipleRegressionResult.coefficients[0])}
                              </td>
                            </tr>
                            {multipleRegressionResult.predictors.map((p, i) => (
                              <tr key={p}>
                                <td style={tdStyle}>{p}</td>
                                <td style={tdStyle}>
                                  {formatNumber(
                                    multipleRegressionResult.coefficients[i + 1]
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {canShowMainPlot && (
                  <div style={{ ...cardStyle, marginTop: 20 }}>
                    <div style={plotHeaderStyle}>
                      <div style={plotTitleStyle}>Main Plot</div>
                      <button
                        onClick={() =>
                          downloadChartPng(
                            mainChartRef,
                            `${safeFileName(fileName || "manual")}_${safeFileName(
                              currentMainTitle
                            )}.png`
                          )
                        }
                        style={buttonStyle}
                      >
                        Download Main Plot PNG
                      </button>
                    </div>

                    <div style={{ height: 520 }}>
                      <ReactChart
                        ref={mainChartRef}
                        type="scatter"
                        data={currentMainChartData}
                        options={mainChartOptions}
                      />
                    </div>
                  </div>
                )}

                {canShowResidualPlot && (
                  <div style={{ ...cardStyle, marginTop: 20 }}>
                    <div style={plotHeaderStyle}>
                      <div style={plotTitleStyle}>Residual Plot</div>
                      <button
                        onClick={() =>
                          downloadChartPng(
                            residualChartRef,
                            `${safeFileName(fileName || "manual")}_${safeFileName(
                              residualTitle
                            )}.png`
                          )
                        }
                        style={buttonStyle}
                      >
                        Download Residual PNG
                      </button>
                    </div>

                    <div style={{ height: 460 }}>
                      <ReactChart
                        ref={residualChartRef}
                        type="scatter"
                        data={currentResidualChartData}
                        options={residualChartOptions}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button onClick={downloadRegressionCsv} style={buttonStyle}>
                    Download Regression CSV
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
};

const statCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
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
  color: "#111827",
};

const smallButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  color: "#111827",
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
  minWidth: 120,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#111827",
};

const equationStyle: React.CSSProperties = {
  fontSize: 17,
  color: "#1d4ed8",
  fontWeight: 700,
  lineHeight: 1.7,
  wordBreak: "break-word",
};

const plotHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const plotTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#111827",
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
  background: "#f8fafc",
  color: "#111827",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #f1f5f9",
  color: "#111827",
};