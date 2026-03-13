"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import {
  surveyAnalyzerInfo,
  surveyColorPalette,
  defaultLikertMap,
  type SurveyChartType,
} from "../../data/tools";

type Row = Record<string, unknown>;

type FrequencyRow = {
  category: string;
  frequency: number;
  percentage: number;
};

type CrossTabMatrix = Record<string, Record<string, number>>;

type DashboardRow = {
  question: string;
  valid: number;
  missing: number;
  categories: number;
  dominantCategory: string;
  dominantFrequency: number;
  dominantPercentage: number;
  likertMean: number | null;
};

type LikertDistributionRow = {
  response: string;
  score: number;
  frequency: number;
};

type LikertSummary = {
  validCount: number;
  missingCount: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  distribution: LikertDistributionRow[];
};

type PieLabelRenderPropsLike = {
  name?: string;
  percent?: number;
};

function normalizeResponse(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function percent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

function mean(arr: number[]): number {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (!arr.length) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function downloadCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function detectLikelySurveyQuestions(rows: Row[], headers: string[]): string[] {
  return headers.filter((header: string) => {
    const values: string[] = rows
      .map((r: Row) => normalizeResponse(r[header]))
      .filter((v: string) => v !== "");

    if (values.length === 0) return false;

    const uniqueValues: string[] = Array.from(new Set(values));
    return uniqueValues.length <= Math.min(30, values.length);
  });
}

function buildFrequencyTable(
  rows: Row[],
  question: string
): {
  table: FrequencyRow[];
  validCount: number;
  missingCount: number;
  totalCount: number;
} {
  const counts = new Map<string, number>();
  let validCount = 0;
  let missingCount = 0;

  for (const row of rows) {
    const response = normalizeResponse(row[question]);

    if (response === "") {
      missingCount++;
      continue;
    }

    validCount++;
    counts.set(response, (counts.get(response) ?? 0) + 1);
  }

  const table: FrequencyRow[] = Array.from(counts.entries())
    .map(([category, frequency]: [string, number]) => ({
      category,
      frequency,
      percentage: percent(frequency, validCount),
    }))
    .sort((a: FrequencyRow, b: FrequencyRow) => b.frequency - a.frequency);

  return {
    table,
    validCount,
    missingCount,
    totalCount: validCount + missingCount,
  };
}

function buildCrossTab(
  rows: Row[],
  questionA: string,
  questionB: string
): {
  aValues: string[];
  bValues: string[];
  matrix: CrossTabMatrix;
} {
  const aValues: string[] = Array.from(
    new Set(
      rows
        .map((r: Row) => normalizeResponse(r[questionA]))
        .filter((v: string) => v !== "")
    )
  );

  const bValues: string[] = Array.from(
    new Set(
      rows
        .map((r: Row) => normalizeResponse(r[questionB]))
        .filter((v: string) => v !== "")
    )
  );

  const matrix: CrossTabMatrix = {};

  for (const a of aValues) {
    matrix[a] = {};
    for (const b of bValues) {
      matrix[a][b] = 0;
    }
  }

  for (const row of rows) {
    const a = normalizeResponse(row[questionA]);
    const b = normalizeResponse(row[questionB]);

    if (a !== "" && b !== "" && matrix[a] && matrix[a][b] !== undefined) {
      matrix[a][b] += 1;
    }
  }

  return { aValues, bValues, matrix };
}

function parseLikertMapping(mappingText: string): Record<string, number> {
  const result: Record<string, number> = {};

  const lines: string[] = mappingText
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split("=");
    if (parts.length !== 2) continue;

    const key = parts[0].trim();
    const value = Number(parts[1].trim());

    if (key && Number.isFinite(value)) {
      result[key] = value;
    }
  }

  return result;
}

function buildLikertSummary(
  rows: Row[],
  question: string,
  likertMap: Record<string, number>
): LikertSummary | null {
  const scoredValues: number[] = [];
  const distributionMap = new Map<string, { score: number; frequency: number }>();

  let validCount = 0;
  let missingCount = 0;

  for (const row of rows) {
    const response = normalizeResponse(row[question]);

    if (response === "") {
      missingCount++;
      continue;
    }

    const score = likertMap[response];
    if (Number.isFinite(score)) {
      validCount++;
      scoredValues.push(score);

      const current = distributionMap.get(response);
      if (current) {
        current.frequency += 1;
      } else {
        distributionMap.set(response, { score, frequency: 1 });
      }
    }
  }

  if (!scoredValues.length) return null;

  const distribution: LikertDistributionRow[] = Array.from(distributionMap.entries())
    .map(([response, info]: [string, { score: number; frequency: number }]) => ({
      response,
      score: info.score,
      frequency: info.frequency,
    }))
    .sort((a: LikertDistributionRow, b: LikertDistributionRow) => a.score - b.score);

  return {
    validCount,
    missingCount,
    mean: mean(scoredValues),
    median: median(scoredValues),
    min: Math.min(...scoredValues),
    max: Math.max(...scoredValues),
    distribution,
  };
}

function buildDashboard(
  rows: Row[],
  questions: string[],
  likertMap: Record<string, number>
): DashboardRow[] {
  return questions.map((question: string) => {
    const freq = buildFrequencyTable(rows, question);
    const dominant = freq.table[0] ?? {
      category: "N/A",
      frequency: 0,
      percentage: 0,
    };
    const likert = buildLikertSummary(rows, question, likertMap);

    return {
      question,
      valid: freq.validCount,
      missing: freq.missingCount,
      categories: freq.table.length,
      dominantCategory: dominant.category,
      dominantFrequency: dominant.frequency,
      dominantPercentage: dominant.percentage,
      likertMean: likert ? likert.mean : null,
    };
  });
}

function buildReportText(args: {
  fileName: string;
  selectedQuestion: string;
  analysis: {
    validCount: number;
    missingCount: number;
    totalCount: number;
    table: FrequencyRow[];
  };
  dominantCategory: FrequencyRow | null;
  chartType: SurveyChartType;
  likertSummary: LikertSummary | null;
  comparisonQuestion: string;
}): string {
  const lines: string[] = [];

  lines.push("Survey Data Analyzer Report");
  lines.push("");
  lines.push(`Dataset: ${args.fileName || "Uploaded file"}`);
  lines.push(`Selected question: ${args.selectedQuestion}`);
  lines.push(`Chart type: ${args.chartType}`);
  lines.push("");
  lines.push("Frequency and Percentage Summary");
  lines.push(`Total responses: ${args.analysis.totalCount}`);
  lines.push(`Valid responses: ${args.analysis.validCount}`);
  lines.push(`Missing responses: ${args.analysis.missingCount}`);
  lines.push("");

  args.analysis.table.forEach((row: FrequencyRow, index: number) => {
    lines.push(
      `${index + 1}. ${row.category} — Frequency: ${row.frequency}, Percentage: ${formatNumber(
        row.percentage,
        2
      )}%`
    );
  });

  lines.push("");
  lines.push("Mathematical Steps");
  lines.push("1. Frequency of each category = number of observations in that category.");
  lines.push("2. Percentage = (Frequency / Total Valid Responses) × 100.");
  if (args.dominantCategory) {
    lines.push(
      `3. Example: (${args.dominantCategory.frequency} / ${args.analysis.validCount}) × 100 = ${formatNumber(
        args.dominantCategory.percentage,
        2
      )}%.`
    );
  }

  if (args.likertSummary) {
    lines.push("");
    lines.push("Likert Scale Summary");
    lines.push(`Valid scored responses: ${args.likertSummary.validCount}`);
    lines.push(`Missing scored responses: ${args.likertSummary.missingCount}`);
    lines.push(`Mean score: ${formatNumber(args.likertSummary.mean, 4)}`);
    lines.push(`Median score: ${formatNumber(args.likertSummary.median, 4)}`);
    lines.push(`Minimum score: ${formatNumber(args.likertSummary.min, 2)}`);
    lines.push(`Maximum score: ${formatNumber(args.likertSummary.max, 2)}`);
  }

  if (args.comparisonQuestion) {
    lines.push("");
    lines.push(`Comparison question selected: ${args.comparisonQuestion}`);
  }

  lines.push("");
  lines.push("Interpretation");
  if (args.dominantCategory) {
    lines.push(
      `The dominant response category is "${args.dominantCategory.category}" with ${args.dominantCategory.frequency} responses (${formatNumber(
        args.dominantCategory.percentage,
        2
      )}%).`
    );
  }

  return lines.join("\n");
}

export default function SurveyDataAnalyzerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [comparisonQuestion, setComparisonQuestion] = useState<string>("");
  const [chartType, setChartType] = useState<SurveyChartType>("bar");
  const [chartTitle, setChartTitle] = useState<string>(
    "Survey Response Distribution"
  );

  const [likertEnabled, setLikertEnabled] = useState<boolean>(true);
  const [likertMappingText, setLikertMappingText] = useState<string>(
    Object.entries(defaultLikertMap)
      .map(([key, value]: [string, number]) => `${key}=${value}`)
      .join("\n")
  );

  const [dashboardQuestions, setDashboardQuestions] = useState<string[]>([]);

  const chartRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

  async function handleUpload(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(firstSheet, { defval: "" });

    const extractedHeaders: string[] = json.length ? Object.keys(json[0]) : [];

    setRows(json);
    setHeaders(extractedHeaders);
    setFileName(file.name);

    const detectedSurveyQuestions = detectLikelySurveyQuestions(json, extractedHeaders);
    setSelectedQuestion(detectedSurveyQuestions[0] ?? extractedHeaders[0] ?? "");
    setComparisonQuestion(detectedSurveyQuestions[1] ?? "");
    setDashboardQuestions(detectedSurveyQuestions.slice(0, 5));
    setChartTitle("Survey Response Distribution");
  }

  const surveyQuestions = useMemo<string[]>(
    () => detectLikelySurveyQuestions(rows, headers),
    [rows, headers]
  );

  const likertMap = useMemo<Record<string, number>>(
    () => parseLikertMapping(likertMappingText),
    [likertMappingText]
  );

  const analysis = useMemo(() => {
    if (!rows.length || !selectedQuestion) return null;
    return buildFrequencyTable(rows, selectedQuestion);
  }, [rows, selectedQuestion]);

  const crossTab = useMemo(() => {
    if (!rows.length || !selectedQuestion || !comparisonQuestion) return null;
    if (selectedQuestion === comparisonQuestion) return null;
    return buildCrossTab(rows, selectedQuestion, comparisonQuestion);
  }, [rows, selectedQuestion, comparisonQuestion]);

  const dominantCategory = useMemo<FrequencyRow | null>(() => {
    if (!analysis || analysis.table.length === 0) return null;
    return analysis.table[0];
  }, [analysis]);

  const likertSummary = useMemo<LikertSummary | null>(() => {
    if (!likertEnabled || !rows.length || !selectedQuestion) return null;
    return buildLikertSummary(rows, selectedQuestion, likertMap);
  }, [likertEnabled, rows, selectedQuestion, likertMap]);

  const dashboard = useMemo<DashboardRow[]>(() => {
    if (!rows.length || !dashboardQuestions.length) return [];
    return buildDashboard(rows, dashboardQuestions, likertMap);
  }, [rows, dashboardQuestions, likertMap]);

  async function downloadChartImage(): Promise<void> {
    if (!chartRef.current) return;

    const canvas = await html2canvas(chartRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    downloadCanvasAsPNG(canvas, "survey-data-chart.png");
  }

  async function exportPDF(): Promise<void> {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const usableWidth = pdfWidth - 2 * margin;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - 2 * margin;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - 2 * margin;
    }

    pdf.save("survey-data-analyzer-report.pdf");
  }

  async function copyReportText(): Promise<void> {
    if (!analysis || !selectedQuestion) return;

    const report = buildReportText({
      fileName,
      selectedQuestion,
      analysis,
      dominantCategory,
      chartType,
      likertSummary,
      comparisonQuestion,
    });

    await navigator.clipboard.writeText(report);
  }

  const previewRows: Row[] = rows.slice(0, 8);

  return (
    <div className="container" style={{ maxWidth: 1200, padding: "40px 20px" , background: "rgba(240, 217, 14, 0.81)", borderRadius: 16 }}>
      <div ref={reportRef}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
          {surveyAnalyzerInfo.title}
        </h1>

        <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 20 }}>
          {surveyAnalyzerInfo.description}
        </p>

        <SectionCard title="Key Features">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            {surveyAnalyzerInfo.features.map((feature: string) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Upload Survey Dataset">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
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
            <SectionCard title="Survey Dataset Summary">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <SummaryBox label="Number of responses" value={String(rows.length)} />
                <SummaryBox label="Number of variables" value={String(headers.length)} />
                <SummaryBox
                  label="Detected survey questions"
                  value={String(surveyQuestions.length)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Question Selection and Chart Options">
              <InputGrid>
                <Select
                  label="Survey question"
                  value={selectedQuestion}
                  onChange={setSelectedQuestion}
                  options={surveyQuestions.map((q: string): [string, string] => [q, q])}
                />

                <Select
                  label="Comparison question (optional)"
                  value={comparisonQuestion}
                  onChange={setComparisonQuestion}
                  options={[
                    ["", "No comparison"],
                    ...surveyQuestions
                      .filter((q: string) => q !== selectedQuestion)
                      .map((q: string): [string, string] => [q, q]),
                  ]}
                />

                <Select
                  label="Chart type"
                  value={chartType}
                  onChange={(v: string) => setChartType(v as SurveyChartType)}
                  options={[
                    ["bar", "Bar Chart"],
                    ["pie", "Pie Chart"],
                  ]}
                />

                <TextInput
                  label="Chart title"
                  value={chartTitle}
                  onChange={setChartTitle}
                />
              </InputGrid>
            </SectionCard>

            <SectionCard title="Likert Scale Scoring">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={likertEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLikertEnabled(e.target.checked)
                    }
                  />
                  Enable Likert scale scoring
                </label>
              </div>

              <label style={labelStyle}>
                Likert mapping (one per line, for example: Agree=4)
              </label>
              <textarea
                value={likertMappingText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setLikertMappingText(e.target.value)
                }
                rows={10}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 180,
                }}
              />
            </SectionCard>

            {analysis && (
              <>
                <SectionCard title="Frequency and Percentage Summary">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <SummaryBox label="Total responses" value={String(analysis.totalCount)} />
                    <SummaryBox label="Valid responses" value={String(analysis.validCount)} />
                    <SummaryBox
                      label="Missing responses"
                      value={String(analysis.missingCount)}
                    />
                    <SummaryBox
                      label="Number of unique categories"
                      value={String(analysis.table.length)}
                    />
                  </div>

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
                          <th style={tableHeadStyle}>Response Category</th>
                          <th style={tableHeadStyle}>Frequency</th>
                          <th style={tableHeadStyle}>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.table.map((row: FrequencyRow) => (
                          <tr key={row.category}>
                            <td style={tableCellStyle}>{row.category}</td>
                            <td style={tableCellStyle}>{row.frequency}</td>
                            <td style={tableCellStyle}>
                              {formatNumber(row.percentage, 2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard title="Graphical Output">
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
                      {chartTitle || "Survey Response Distribution"}
                    </h3>

                    {chartType === "bar" && (
                      <div style={{ width: "100%", height: 420 }}>
                        <ResponsiveContainer>
                          <BarChart data={analysis.table}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="category"
                              angle={-20}
                              textAnchor="end"
                              height={90}
                              interval={0}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="frequency" fill="#FFC000" name="Frequency">
                              <LabelList dataKey="frequency" position="top" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {chartType === "pie" && (
                      <div style={{ width: "100%", height: 420 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={analysis.table}
                              dataKey="frequency"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={130}
                              label={(props: PieLabelRenderPropsLike) => {
                                const name = props.name ?? "";
                                const p = props.percent ?? 0;
                                return `${name}: ${(p * 100).toFixed(1)}%`;
                              }}
                            >
                              {analysis.table.map((_: FrequencyRow, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    surveyColorPalette[index % surveyColorPalette.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={() => void downloadChartImage()}
                      style={primaryButtonStyle}
                    >
                      Download Chart Image
                    </button>
                    <button onClick={() => void exportPDF()} style={secondaryButtonStyle}>
                      Export PDF
                    </button>
                    <button
                      onClick={() => void copyReportText()}
                      style={secondaryButtonStyle}
                    >
                      Copy Report Text
                    </button>
                  </div>
                </SectionCard>

                {likertEnabled && likertSummary && (
                  <SectionCard title="Likert Scale Summary">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                        marginBottom: 20,
                      }}
                    >
                      <SummaryBox
                        label="Valid scored responses"
                        value={String(likertSummary.validCount)}
                      />
                      <SummaryBox
                        label="Missing scored responses"
                        value={String(likertSummary.missingCount)}
                      />
                      <SummaryBox
                        label="Mean score"
                        value={formatNumber(likertSummary.mean, 4)}
                      />
                      <SummaryBox
                        label="Median score"
                        value={formatNumber(likertSummary.median, 4)}
                      />
                      <SummaryBox
                        label="Minimum score"
                        value={formatNumber(likertSummary.min, 2)}
                      />
                      <SummaryBox
                        label="Maximum score"
                        value={formatNumber(likertSummary.max, 2)}
                      />
                    </div>

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
                            <th style={tableHeadStyle}>Response</th>
                            <th style={tableHeadStyle}>Score</th>
                            <th style={tableHeadStyle}>Frequency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {likertSummary.distribution.map(
                            (item: LikertDistributionRow) => (
                              <tr key={item.response}>
                                <td style={tableCellStyle}>{item.response}</td>
                                <td style={tableCellStyle}>{item.score}</td>
                                <td style={tableCellStyle}>{item.frequency}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                <SectionCard title="Mathematical Steps and Detailed Explanation">
                  <div style={stepCardStyle}>
                    <strong>Step 1. Identify the survey question</strong>
                    <div style={{ marginTop: 6 }}>
                      The selected survey question is: <strong>{selectedQuestion}</strong>.
                    </div>
                  </div>

                  <div style={stepCardStyle}>
                    <strong>Step 2. Count valid and missing responses</strong>
                    <div style={{ marginTop: 6 }}>
                      Total responses = <strong>{analysis.totalCount}</strong>, valid
                      responses = <strong>{analysis.validCount}</strong>, and missing
                      responses = <strong>{analysis.missingCount}</strong>.
                    </div>
                  </div>

                  <div style={stepCardStyle}>
                    <strong>Step 3. Construct the frequency table</strong>
                    <div style={{ marginTop: 6 }}>
                      For each response category, the frequency is the number of
                      respondents who selected that category.
                    </div>
                    <div style={{ marginTop: 10 }}>
                      Mathematically, for a category <em>c</em>:
                    </div>
                    <div style={mathBoxStyle}>
                      Frequency of c = number of observations with response c
                    </div>
                  </div>

                  <div style={stepCardStyle}>
                    <strong>Step 4. Compute percentages</strong>
                    <div style={{ marginTop: 6 }}>
                      The percentage for each category is computed using:
                    </div>
                    <div style={mathBoxStyle}>
                      Percentage = (Frequency / Total Valid Responses) × 100
                    </div>
                    <div style={{ marginTop: 10 }}>
                      For example, if a category has frequency{" "}
                      <strong>{dominantCategory?.frequency ?? 0}</strong> and valid
                      responses are <strong>{analysis.validCount}</strong>, then
                    </div>
                    <div style={mathBoxStyle}>
                      Percentage = ({dominantCategory?.frequency ?? 0} /{" "}
                      {analysis.validCount}) × 100 ={" "}
                      {formatNumber(dominantCategory?.percentage ?? 0, 2)}%
                    </div>
                  </div>

                  {likertEnabled && likertSummary && (
                    <div style={stepCardStyle}>
                      <strong>Step 5. Compute Likert scale summary statistics</strong>
                      <div style={{ marginTop: 6 }}>
                        After mapping each response to a numerical score, the mean
                        score is computed using:
                      </div>
                      <div style={mathBoxStyle}>
                        Mean score = (Sum of all valid scores) / (Number of valid scored
                        responses)
                      </div>
                      <div style={{ marginTop: 10 }}>
                        In this question, the mean Likert score is{" "}
                        <strong>{formatNumber(likertSummary.mean, 4)}</strong> and the
                        median score is{" "}
                        <strong>{formatNumber(likertSummary.median, 4)}</strong>.
                      </div>
                    </div>
                  )}

                  <div style={stepCardStyle}>
                    <strong>Step 6. Interpret the response distribution</strong>
                    <div style={{ marginTop: 6 }}>
                      The response distribution describes how responses are spread
                      across categories. A category with a larger percentage
                      represents a stronger concentration of responses.
                    </div>
                  </div>

                  <div style={stepCardStyle}>
                    <strong>Step 7. Understand the graphical representation</strong>
                    <div style={{ marginTop: 6 }}>
                      {chartType === "bar" ? (
                        <>
                          In the bar chart, the height of each bar represents the
                          frequency of a response category. Larger bars indicate more
                          responses in that category.
                        </>
                      ) : (
                        <>
                          In the pie chart, each sector represents the share of total
                          valid responses in a category. Larger sectors indicate larger
                          proportions.
                        </>
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Response Distribution Interpretation">
                  <div style={{ lineHeight: 1.9 }}>
                    <p>
                      The most frequent response category is{" "}
                      <strong>{dominantCategory?.category ?? "N/A"}</strong> with
                      frequency <strong>{dominantCategory?.frequency ?? 0}</strong> and
                      percentage{" "}
                      <strong>
                        {formatNumber(dominantCategory?.percentage ?? 0, 2)}%
                      </strong>.
                    </p>
                    <p>
                      This indicates that this category is the dominant response among
                      valid respondents for the selected question.
                    </p>
                    {likertEnabled && likertSummary && (
                      <p>
                        The Likert mean score is{" "}
                        <strong>{formatNumber(likertSummary.mean, 4)}</strong>, which
                        provides a single numerical summary of the overall attitude or
                        perception expressed in this question.
                      </p>
                    )}
                    <p>
                      Frequency and percentage summaries are especially useful in
                      student projects, theses, evaluation reports, and NGO surveys
                      because they provide a clear description of categorical data.
                    </p>
                  </div>
                </SectionCard>

                {dashboard.length > 0 && (
                  <SectionCard title="Multiple-Question Dashboard">
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
                            <th style={tableHeadStyle}>Question</th>
                            <th style={tableHeadStyle}>Valid</th>
                            <th style={tableHeadStyle}>Missing</th>
                            <th style={tableHeadStyle}>Categories</th>
                            <th style={tableHeadStyle}>Dominant Category</th>
                            <th style={tableHeadStyle}>Dominant %</th>
                            <th style={tableHeadStyle}>Likert Mean</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.map((item: DashboardRow) => (
                            <tr key={item.question}>
                              <td style={tableCellStyle}>{item.question}</td>
                              <td style={tableCellStyle}>{item.valid}</td>
                              <td style={tableCellStyle}>{item.missing}</td>
                              <td style={tableCellStyle}>{item.categories}</td>
                              <td style={tableCellStyle}>{item.dominantCategory}</td>
                              <td style={tableCellStyle}>
                                {formatNumber(item.dominantPercentage, 2)}%
                              </td>
                              <td style={tableCellStyle}>
                                {item.likertMean === null
                                  ? "N/A"
                                  : formatNumber(item.likertMean, 4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {crossTab && (
                  <SectionCard title="Optional Cross-Question Comparison">
                    <p style={{ marginTop: 0, lineHeight: 1.8 }}>
                      This section compares <strong>{selectedQuestion}</strong> with{" "}
                      <strong>{comparisonQuestion}</strong>.
                    </p>

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
                            <th style={tableHeadStyle}>{selectedQuestion}</th>
                            {crossTab.bValues.map((b: string) => (
                              <th key={b} style={tableHeadStyle}>
                                {b}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {crossTab.aValues.map((a: string) => (
                            <tr key={a}>
                              <td style={tableCellStyle}>
                                <strong>{a}</strong>
                              </td>
                              {crossTab.bValues.map((b: string) => (
                                <td key={b} style={tableCellStyle}>
                                  {crossTab.matrix[a][b]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: 16, lineHeight: 1.9 }}>
                      <strong>Mathematical note:</strong> Each cell in the above table
                      is a joint frequency, meaning the number of respondents who
                      simultaneously belong to the row category and the column category.
                    </div>
                  </SectionCard>
                )}

                <SectionCard title="Preview of Uploaded Survey Data">
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
                          {headers.map((header: string) => (
                            <th key={header} style={tableHeadStyle}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row: Row, i: number) => (
                          <tr key={i}>
                            {headers.map((header: string) => (
                              <td key={header} style={tableCellStyle}>
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
          </>
        )}
      </div>
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
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      >
        {options.map(([val, text]: [string, string]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      />
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

const secondaryButtonStyle: React.CSSProperties = {
  background: "#f5f5f5",
  color: "#111",
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "12px 18px",
  fontWeight: 600,
  cursor: "pointer",
};

const mathBoxStyle: React.CSSProperties = {
  background: "#f8f8f8",
  borderRadius: 8,
  padding: "12px 14px",
  marginTop: 10,
  fontSize: "1rem",
  fontWeight: 500,
  lineHeight: 1.8,
};

const stepCardStyle: React.CSSProperties = {
  marginBottom: 14,
  background: "#fcfcfc",
  border: "1px solid #eee",
  borderRadius: 8,
  padding: "12px 14px",
  lineHeight: 1.8,
};

const tableHeadStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  background: "#f8f8f8",
  textAlign: "left",
};

const tableCellStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
};