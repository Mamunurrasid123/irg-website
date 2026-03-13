"use client";

import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  datasetCleaningInfo,
  missingTokensDefault,
  standardizationOptions,
} from "../../data/tools";

type Row = Record<string, unknown>;

type ColumnType = "numeric" | "text" | "mixed" | "empty";

type ColumnProfile = {
  column: string;
  nonMissing: number;
  missing: number;
  missingPercent: number;
  detectedType: ColumnType;
  uniqueCount: number;
  sampleValues: string[];
};

type MissingSummaryRow = {
  column: string;
  missing: number;
  missingPercent: number;
};

type InconsistencyRow = {
  column: string;
  canonical: string;
  variants: string[];
  count: number;
};

type FormatIssueRow = {
  column: string;
  expectedType: string;
  invalidCount: number;
  invalidExamples: string[];
};

type DuplicateSummary = {
  duplicateRows: number;
  uniqueRows: number;
  duplicateGroups: number;
  duplicateIndices: number[];
};

type CleaningStats = {
  rowsBefore: number;
  rowsAfter: number;
  columns: number;
  removedDuplicateRows: number;
  trimmedCells: number;
  standardizedCells: number;
  convertedMissingTokens: number;
};

type CaseMode = "none" | "lower" | "upper" | "title";

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function safeTrim(value: unknown): string {
  return normalizeString(value).trim();
}

function isMissingValue(value: unknown, missingTokens: Set<string>): boolean {
  const raw = normalizeString(value);
  const trimmed = raw.trim().toLowerCase();
  return missingTokens.has(trimmed);
}

function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (s === "") return false;
  return Number.isFinite(Number(s));
}

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function applyCaseMode(text: string, mode: CaseMode): string {
  if (mode === "lower") return text.toLowerCase();
  if (mode === "upper") return text.toUpperCase();
  if (mode === "title") return titleCase(text);
  return text;
}

function serializeRow(row: Row, headers: string[]): string {
  return JSON.stringify(
    headers.map((h) => {
      const v = row[h];
      return v === undefined ? null : v;
    })
  );
}

function detectColumnType(values: unknown[], missingTokens: Set<string>): ColumnType {
  const nonMissing = values.filter((v) => !isMissingValue(v, missingTokens));

  if (nonMissing.length === 0) return "empty";

  const numericCount = nonMissing.filter((v) => isNumericValue(v)).length;
  if (numericCount === nonMissing.length) return "numeric";
  if (numericCount === 0) return "text";
  return "mixed";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildReportText(args: {
  fileName: string;
  profiles: ColumnProfile[];
  missingSummary: MissingSummaryRow[];
  duplicateSummary: DuplicateSummary;
  inconsistencies: InconsistencyRow[];
  formatIssues: FormatIssueRow[];
  stats: CleaningStats;
}): string {
  const lines: string[] = [];

  lines.push("Dataset Cleaning Report");
  lines.push("");
  lines.push(`Dataset: ${args.fileName || "Uploaded dataset"}`);
  lines.push(`Rows before cleaning: ${args.stats.rowsBefore}`);
  lines.push(`Rows after cleaning: ${args.stats.rowsAfter}`);
  lines.push(`Columns: ${args.stats.columns}`);
  lines.push("");

  lines.push("1. Missing Value Summary");
  args.missingSummary.forEach((row: MissingSummaryRow, index: number) => {
    lines.push(
      `${index + 1}. ${row.column}: missing = ${row.missing}, missing % = ${formatNumber(
        row.missingPercent,
        2
      )}%`
    );
  });

  lines.push("");
  lines.push("2. Duplicate Row Summary");
  lines.push(`Duplicate rows identified: ${args.duplicateSummary.duplicateRows}`);
  lines.push(`Unique rows retained: ${args.duplicateSummary.uniqueRows}`);
  lines.push(`Duplicate groups: ${args.duplicateSummary.duplicateGroups}`);

  lines.push("");
  lines.push("3. Column Profiles");
  args.profiles.forEach((p: ColumnProfile, index: number) => {
    lines.push(
      `${index + 1}. ${p.column}: type = ${p.detectedType}, non-missing = ${p.nonMissing}, missing = ${p.missing}, unique = ${p.uniqueCount}`
    );
  });

  lines.push("");
  lines.push("4. Format Issues");
  if (args.formatIssues.length === 0) {
    lines.push("No major format issues detected.");
  } else {
    args.formatIssues.forEach((issue: FormatIssueRow, index: number) => {
      lines.push(
        `${index + 1}. ${issue.column}: expected ${issue.expectedType}, invalid count = ${issue.invalidCount}, examples = ${issue.invalidExamples.join(
          ", "
        )}`
      );
    });
  }

  lines.push("");
  lines.push("5. Inconsistent Category Issues");
  if (args.inconsistencies.length === 0) {
    lines.push("No major inconsistent categorical variants detected.");
  } else {
    args.inconsistencies.forEach((item: InconsistencyRow, index: number) => {
      lines.push(
        `${index + 1}. ${item.column}: canonical form = "${item.canonical}", variants = ${item.variants.join(
          ", "
        )}, count = ${item.count}`
      );
    });
  }

  lines.push("");
  lines.push("6. Cleaning Actions");
  lines.push(`Removed duplicate rows: ${args.stats.removedDuplicateRows}`);
  lines.push(`Trimmed cells: ${args.stats.trimmedCells}`);
  lines.push(`Standardized cells: ${args.stats.standardizedCells}`);
  lines.push(`Converted missing tokens to blank/missing: ${args.stats.convertedMissingTokens}`);

  lines.push("");
  lines.push("7. Analytical Notes");
  lines.push("Missing percentage for a column = (missing values in column / total rows) × 100.");
  lines.push("Duplicate rows are identified by exact row-wise matching across all columns.");
  lines.push("Categorical inconsistencies are identified after trimming spaces and comparing lowercase forms.");
  lines.push("Column format checking compares observed cell values against the detected dominant column type.");

  return lines.join("\n");
}

export default function DatasetCleaningToolPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);
  const [trimWhitespace, setTrimWhitespace] = useState<boolean>(true);
  const [standardizeCase, setStandardizeCase] = useState<CaseMode>("none");
  const [normalizeMissing, setNormalizeMissing] = useState<boolean>(true);
  const [missingTokensText, setMissingTokensText] = useState<string>(
    missingTokensDefault.join(", ")
  );

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
  }

  const missingTokensSet = useMemo<Set<string>>(() => {
    const tokens = missingTokensText
      .split(",")
      .map((t: string) => t.trim().toLowerCase());
    return new Set(tokens);
  }, [missingTokensText]);

  const profiles = useMemo<ColumnProfile[]>(() => {
    if (!rows.length) return [];

    return headers.map((header: string) => {
      const values = rows.map((r: Row) => r[header]);
      const missing = values.filter((v) => isMissingValue(v, missingTokensSet)).length;
      const nonMissingValues = values.filter((v) => !isMissingValue(v, missingTokensSet));
      const uniqueCount = new Set(nonMissingValues.map((v) => safeTrim(v))).size;
      const detectedType = detectColumnType(values, missingTokensSet);

      return {
        column: header,
        nonMissing: nonMissingValues.length,
        missing,
        missingPercent: rows.length === 0 ? 0 : (missing / rows.length) * 100,
        detectedType,
        uniqueCount,
        sampleValues: nonMissingValues
          .slice(0, 5)
          .map((v) => safeTrim(v))
          .filter(Boolean),
      };
    });
  }, [rows, headers, missingTokensSet]);

  const missingSummary = useMemo<MissingSummaryRow[]>(() => {
    return profiles.map((p: ColumnProfile) => ({
      column: p.column,
      missing: p.missing,
      missingPercent: p.missingPercent,
    }));
  }, [profiles]);

  const duplicateSummary = useMemo<DuplicateSummary>(() => {
    if (!rows.length) {
      return {
        duplicateRows: 0,
        uniqueRows: 0,
        duplicateGroups: 0,
        duplicateIndices: [],
      };
    }

    const map = new Map<string, number[]>();

    rows.forEach((row: Row, index: number) => {
      const key = serializeRow(row, headers);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(index);
    });

    const duplicateGroups = Array.from(map.values()).filter(
      (indices: number[]) => indices.length > 1
    );

    const duplicateIndices = duplicateGroups.flatMap((indices: number[]) =>
      indices.slice(1)
    );

    return {
      duplicateRows: duplicateIndices.length,
      uniqueRows: rows.length - duplicateIndices.length,
      duplicateGroups: duplicateGroups.length,
      duplicateIndices,
    };
  }, [rows, headers]);

  const inconsistencies = useMemo<InconsistencyRow[]>(() => {
    const issues: InconsistencyRow[] = [];

    for (const header of headers) {
      const profile = profiles.find((p: ColumnProfile) => p.column === header);
      if (!profile || profile.detectedType !== "text") continue;

      const grouped = new Map<string, Set<string>>();
      const counts = new Map<string, number>();

      for (const row of rows) {
        const raw = normalizeString(row[header]);
        if (isMissingValue(raw, missingTokensSet)) continue;

        const canonical = raw.trim().toLowerCase();
        if (!canonical) continue;

        if (!grouped.has(canonical)) grouped.set(canonical, new Set<string>());
        grouped.get(canonical)!.add(raw);

        counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
      }

      for (const [canonical, variantsSet] of grouped.entries()) {
        const variants = Array.from(variantsSet);
        if (variants.length > 1) {
          issues.push({
            column: header,
            canonical,
            variants,
            count: counts.get(canonical) ?? 0,
          });
        }
      }
    }

    return issues.sort((a: InconsistencyRow, b: InconsistencyRow) => b.count - a.count);
  }, [rows, headers, profiles, missingTokensSet]);

  const formatIssues = useMemo<FormatIssueRow[]>(() => {
    const issues: FormatIssueRow[] = [];

    for (const header of headers) {
      const profile = profiles.find((p: ColumnProfile) => p.column === header);
      if (!profile) continue;

      if (profile.detectedType === "numeric") {
        const invalidExamples: string[] = [];
        let invalidCount = 0;

        for (const row of rows) {
          const raw = row[header];
          if (isMissingValue(raw, missingTokensSet)) continue;

          if (!isNumericValue(raw)) {
            invalidCount++;
            if (invalidExamples.length < 5) {
              invalidExamples.push(safeTrim(raw));
            }
          }
        }

        if (invalidCount > 0) {
          issues.push({
            column: header,
            expectedType: "numeric",
            invalidCount,
            invalidExamples,
          });
        }
      }

      if (profile.detectedType === "mixed") {
        const invalidExamples: string[] = [];
        let invalidCount = 0;

        for (const row of rows) {
          const raw = row[header];
          if (isMissingValue(raw, missingTokensSet)) continue;

          if (!isNumericValue(raw)) {
            invalidCount++;
            if (invalidExamples.length < 5) {
              invalidExamples.push(safeTrim(raw));
            }
          }
        }

        if (invalidCount > 0) {
          issues.push({
            column: header,
            expectedType: "mixed / review needed",
            invalidCount,
            invalidExamples,
          });
        }
      }
    }

    return issues;
  }, [rows, headers, profiles, missingTokensSet]);

  const cleanedResult = useMemo(() => {
    if (!rows.length) {
      return {
        cleanedRows: [] as Row[],
        stats: {
          rowsBefore: 0,
          rowsAfter: 0,
          columns: 0,
          removedDuplicateRows: 0,
          trimmedCells: 0,
          standardizedCells: 0,
          convertedMissingTokens: 0,
        } as CleaningStats,
      };
    }

    let trimmedCells = 0;
    let standardizedCells = 0;
    let convertedMissingTokens = 0;

    const transformed: Row[] = rows.map((row: Row) => {
      const newRow: Row = {};

      for (const header of headers) {
        const original = row[header];
        let value = original;

        if (typeof value === "string" && trimWhitespace) {
          const trimmed = value.trim();
          if (trimmed !== value) trimmedCells++;
          value = trimmed;
        }

        if (normalizeMissing && isMissingValue(value, missingTokensSet)) {
          if (normalizeString(value) !== "") convertedMissingTokens++;
          value = "";
        }

        const profile = profiles.find((p: ColumnProfile) => p.column === header);
        if (
          typeof value === "string" &&
          value !== "" &&
          profile?.detectedType === "text" &&
          standardizeCase !== "none"
        ) {
          const standardized = applyCaseMode(value, standardizeCase);
          if (standardized !== value) standardizedCells++;
          value = standardized;
        }

        newRow[header] = value;
      }

      return newRow;
    });

    let cleanedRows = transformed;
    let removedDuplicateRows = 0;

    if (removeDuplicates) {
      const seen = new Set<string>();
      const uniqueRows: Row[] = [];

      for (const row of transformed) {
        const key = serializeRow(row, headers);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRows.push(row);
        } else {
          removedDuplicateRows++;
        }
      }

      cleanedRows = uniqueRows;
    }

    return {
      cleanedRows,
      stats: {
        rowsBefore: rows.length,
        rowsAfter: cleanedRows.length,
        columns: headers.length,
        removedDuplicateRows,
        trimmedCells,
        standardizedCells,
        convertedMissingTokens,
      } as CleaningStats,
    };
  }, [
    rows,
    headers,
    trimWhitespace,
    standardizeCase,
    normalizeMissing,
    missingTokensSet,
    profiles,
    removeDuplicates,
  ]);

  async function downloadCleanedExcel(): Promise<void> {
    if (!cleanedResult.cleanedRows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(cleanedResult.cleanedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");

    const arrayBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    downloadBlob(blob, "cleaned_dataset.xlsx");
  }

  async function copyReportText(): Promise<void> {
    const report = buildReportText({
      fileName,
      profiles,
      missingSummary,
      duplicateSummary,
      inconsistencies,
      formatIssues,
      stats: cleanedResult.stats,
    });

    await navigator.clipboard.writeText(report);
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

    pdf.save("dataset-cleaning-report.pdf");
  }

  const previewRows = rows.slice(0, 8);
  const cleanedPreviewRows = cleanedResult.cleanedRows.slice(0, 8);

  return (
    <div className="container" style={{ maxWidth: 1200, padding: "40px 20px" ,background: "rgba(240, 217, 14, 0.81)", borderRadius: 16 }}>
      <div ref={reportRef}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
          {datasetCleaningInfo.title}
        </h1>

        <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 20 }}>
          {datasetCleaningInfo.description}
        </p>

        <SectionCard title="Key Features">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            {datasetCleaningInfo.features.map((feature: string) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </SectionCard>

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
            <SectionCard title="Cleaning Options">
              <InputGrid>
                <CheckboxCard
                  label="Remove duplicate rows"
                  checked={removeDuplicates}
                  onChange={setRemoveDuplicates}
                />
                <CheckboxCard
                  label="Trim leading and trailing whitespace"
                  checked={trimWhitespace}
                  onChange={setTrimWhitespace}
                />
                <CheckboxCard
                  label="Normalize missing-value tokens"
                  checked={normalizeMissing}
                  onChange={setNormalizeMissing}
                />
                <Select
                  label="Case standardization"
                  value={standardizeCase}
                  onChange={(v: string) => setStandardizeCase(v as CaseMode)}
                  options={standardizationOptions.map(
                    (item): [string, string] => [item.value, item.label]
                  )}
                />
              </InputGrid>

              <div style={{ marginTop: 18 }}>
                <label style={labelStyle}>
                  Missing value tokens (comma-separated)
                </label>
                <textarea
                  value={missingTokensText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMissingTokensText(e.target.value)
                  }
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 100,
                  }}
                />
              </div>
            </SectionCard>

            <SectionCard title="Dataset Overview">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <SummaryBox label="Rows before cleaning" value={String(cleanedResult.stats.rowsBefore)} />
                <SummaryBox label="Rows after cleaning" value={String(cleanedResult.stats.rowsAfter)} />
                <SummaryBox label="Columns" value={String(cleanedResult.stats.columns)} />
                <SummaryBox
                  label="Removed duplicate rows"
                  value={String(cleanedResult.stats.removedDuplicateRows)}
                />
                <SummaryBox
                  label="Trimmed cells"
                  value={String(cleanedResult.stats.trimmedCells)}
                />
                <SummaryBox
                  label="Standardized cells"
                  value={String(cleanedResult.stats.standardizedCells)}
                />
                <SummaryBox
                  label="Converted missing tokens"
                  value={String(cleanedResult.stats.convertedMissingTokens)}
                />
              </div>
            </SectionCard>

            <SectionCard title="Missing Value Detection">
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeadStyle}>Column</th>
                      <th style={tableHeadStyle}>Missing Values</th>
                      <th style={tableHeadStyle}>Missing Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingSummary.map((row: MissingSummaryRow) => (
                      <tr key={row.column}>
                        <td style={tableCellStyle}>{row.column}</td>
                        <td style={tableCellStyle}>{row.missing}</td>
                        <td style={tableCellStyle}>{formatNumber(row.missingPercent, 2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Duplicate Row Identification">
              <div style={{ lineHeight: 1.9 }}>
                <p>
                  Duplicate rows identified: <strong>{duplicateSummary.duplicateRows}</strong>
                </p>
                <p>
                  Unique rows retained: <strong>{duplicateSummary.uniqueRows}</strong>
                </p>
                <p>
                  Duplicate groups: <strong>{duplicateSummary.duplicateGroups}</strong>
                </p>
                {duplicateSummary.duplicateIndices.length > 0 && (
                  <p>
                    Duplicate row indices removed or flagged:{" "}
                    <strong>{duplicateSummary.duplicateIndices.join(", ")}</strong>
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Column Format Checking">
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHeadStyle}>Column</th>
                      <th style={tableHeadStyle}>Detected Type</th>
                      <th style={tableHeadStyle}>Non-missing</th>
                      <th style={tableHeadStyle}>Missing</th>
                      <th style={tableHeadStyle}>Unique Values</th>
                      <th style={tableHeadStyle}>Sample Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile: ColumnProfile) => (
                      <tr key={profile.column}>
                        <td style={tableCellStyle}>{profile.column}</td>
                        <td style={tableCellStyle}>{profile.detectedType}</td>
                        <td style={tableCellStyle}>{profile.nonMissing}</td>
                        <td style={tableCellStyle}>{profile.missing}</td>
                        <td style={tableCellStyle}>{profile.uniqueCount}</td>
                        <td style={tableCellStyle}>{profile.sampleValues.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Detected Format Issues">
              {formatIssues.length === 0 ? (
                <p style={{ margin: 0 }}>No major format issues detected.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Column</th>
                        <th style={tableHeadStyle}>Expected Type</th>
                        <th style={tableHeadStyle}>Invalid Count</th>
                        <th style={tableHeadStyle}>Invalid Examples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formatIssues.map((issue: FormatIssueRow, index: number) => (
                        <tr key={`${issue.column}-${index}`}>
                          <td style={tableCellStyle}>{issue.column}</td>
                          <td style={tableCellStyle}>{issue.expectedType}</td>
                          <td style={tableCellStyle}>{issue.invalidCount}</td>
                          <td style={tableCellStyle}>{issue.invalidExamples.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Inconsistent Entries Detection">
              {inconsistencies.length === 0 ? (
                <p style={{ margin: 0 }}>
                  No major inconsistent categorical variants detected.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Column</th>
                        <th style={tableHeadStyle}>Canonical Form</th>
                        <th style={tableHeadStyle}>Variants</th>
                        <th style={tableHeadStyle}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inconsistencies.map((row: InconsistencyRow, index: number) => (
                        <tr key={`${row.column}-${row.canonical}-${index}`}>
                          <td style={tableCellStyle}>{row.column}</td>
                          <td style={tableCellStyle}>{row.canonical}</td>
                          <td style={tableCellStyle}>{row.variants.join(", ")}</td>
                          <td style={tableCellStyle}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Mathematical and Analytical Cleaning Summary">
              <div style={stepCardStyle}>
                <strong>Step 1. Missing value rate</strong>
                <div style={{ marginTop: 6 }}>
                  For each column, the missing percentage is computed as:
                </div>
                <div style={mathBoxStyle}>
                  Missing Percentage = (Number of Missing Values / Total Number of Rows) × 100
                </div>
              </div>

              <div style={stepCardStyle}>
                <strong>Step 2. Duplicate row detection</strong>
                <div style={{ marginTop: 6 }}>
                  Each row is serialized across all columns. If two serialized rows are identical,
                  they are considered duplicates.
                </div>
                <div style={mathBoxStyle}>
                  Duplicate Rule: Row i = Row j across all selected columns
                </div>
              </div>

              <div style={stepCardStyle}>
                <strong>Step 3. Column format checking</strong>
                <div style={{ marginTop: 6 }}>
                  Column type is inferred from observed values. A column is treated as numeric if all
                  non-missing values are numeric, text if none are numeric, mixed if both appear, and
                  empty if all values are missing.
                </div>
              </div>

              <div style={stepCardStyle}>
                <strong>Step 4. Inconsistent categorical entries</strong>
                <div style={{ marginTop: 6 }}>
                  Text entries are compared after trimming whitespace and converting to lowercase.
                  For example, "Dhaka", " dhaka ", and "DHAKA" are detected as inconsistent variants
                  of the same underlying category.
                </div>
              </div>

              <div style={stepCardStyle}>
                <strong>Step 5. Cleaning actions</strong>
                <div style={{ marginTop: 6 }}>
                  The cleaned dataset is produced after applying the selected operations:
                  duplicate removal, whitespace trimming, missing-token normalization, and case standardization.
                </div>
              </div>

              <div style={stepCardStyle}>
                <strong>Interpretation</strong>
                <div style={{ marginTop: 6 }}>
                  A dataset with fewer missing values, fewer duplicates, consistent category naming,
                  and valid column formats is more reliable for regression, visualization, inference,
                  and publication-quality analysis.
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Original Dataset Preview">
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
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

            <SectionCard title="Cleaned Dataset Preview">
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
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
                    {cleanedPreviewRows.map((row: Row, i: number) => (
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

            <SectionCard title="Actions">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => void downloadCleanedExcel()}
                  style={primaryButtonStyle}
                >
                  Download Cleaned Dataset
                </button>
                <button onClick={() => void exportPDF()} style={secondaryButtonStyle}>
                  Export PDF Report
                </button>
                <button
                  onClick={() => void copyReportText()}
                  style={secondaryButtonStyle}
                >
                  Copy Report Text
                </button>
              </div>
            </SectionCard>
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

function CheckboxCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 14,
        background: "#fcfcfc",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.checked)
        }
      />
      <span>{label}</span>
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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.95rem",
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