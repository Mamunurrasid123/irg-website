"use client";

import React, { useMemo, useRef, useState } from "react";
import { jStat } from "jstat";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type TestType =
  | "one-sample-z"
  | "one-sample-t"
  | "one-proportion-z"
  | "two-sample-z"
  | "two-sample-t"
  | "paired-t"
  | "two-proportion-z"
  | "chi-square-variance";

type TailType = "two-sided" | "left-tailed" | "right-tailed";
type InputMode = "summary" | "raw" | "excel";

type TestResult = {
  title: string;
  question: string;
  hypotheses: string[];
  formulaText: string;
  criticalInfo: string;
  resultSummary: string[];
  criticalExplanation: string[];
  steps: string[];
  interpretation: string;
  statisticLabel: string;
  statisticValue: number;
  pValue: number;
  alpha: number;
  tailType: TailType;
  rejectionRegionText: string;
  decisionText: string;
  graph: {
    distribution: "normal" | "t" | "chi-square";
    testStatistic: number;
    leftCritical?: number;
    rightCritical?: number;
    df?: number;
  };
};

function toNum(value: string) {
  const x = parseFloat(value);
  return Number.isFinite(x) ? x : NaN;
}

function fmt(x: number, d = 6) {
  return Number.isFinite(x) ? x.toFixed(d) : "";
}

function parseNumericList(text: string) {
  return text
    .split(/[\s,;\n\t]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map(Number)
    .filter((v) => Number.isFinite(v));
}

function parseBinaryValue(value: unknown): number | null {
  if (typeof value === "number") {
    if (value === 0 || value === 1) return value;
    return null;
  }

  const s = String(value).trim().toLowerCase();
  if (["1", "yes", "y", "true", "success", "passed"].includes(s)) return 1;
  if (["0", "no", "n", "false", "failure", "failed"].includes(s)) return 0;
  return null;
}

function parseBinaryList(text: string) {
  return text
    .split(/[\s,;\n\t]+/)
    .map((v) => parseBinaryValue(v))
    .filter((v): v is number => v === 0 || v === 1);
}

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleVariance(arr: number[]) {
  const m = mean(arr);
  return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

function sampleStd(arr: number[]) {
  return Math.sqrt(sampleVariance(arr));
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function getNumericColumn(rows: Record<string, unknown>[], col: string) {
  return rows.map((r) => Number(r[col])).filter((v) => Number.isFinite(v));
}

function getBinaryColumn(rows: Record<string, unknown>[], col: string) {
  return rows
    .map((r) => parseBinaryValue(r[col]))
    .filter((v): v is number => v === 0 || v === 1);
}

function alphaValue(significanceLevel: number) {
  return significanceLevel / 100;
}

function normalPValue(z: number, tail: TailType) {
  const cdf = jStat.normal.cdf(z, 0, 1);
  if (tail === "left-tailed") return cdf;
  if (tail === "right-tailed") return 1 - cdf;
  return 2 * Math.min(cdf, 1 - cdf);
}

function tPValue(t: number, df: number, tail: TailType) {
  const cdf = jStat.studentt.cdf(t, df);
  if (tail === "left-tailed") return cdf;
  if (tail === "right-tailed") return 1 - cdf;
  return 2 * Math.min(cdf, 1 - cdf);
}

function chiSquarePValue(chi: number, df: number, tail: TailType) {
  const cdf = jStat.chisquare.cdf(chi, df);
  if (tail === "left-tailed") return cdf;
  if (tail === "right-tailed") return 1 - cdf;
  return 2 * Math.min(cdf, 1 - cdf);
}

function getCriticalValues(
  distribution: "normal" | "t" | "chi-square",
  alpha: number,
  tail: TailType,
  df?: number
) {
  if (distribution === "normal") {
    if (tail === "two-sided") {
      const c = jStat.normal.inv(1 - alpha / 2, 0, 1);
      return { leftCritical: -c, rightCritical: c };
    }
    if (tail === "left-tailed") {
      return { leftCritical: jStat.normal.inv(alpha, 0, 1) };
    }
    return { rightCritical: jStat.normal.inv(1 - alpha, 0, 1) };
  }

  if (distribution === "t") {
    const d = df ?? 1;
    if (tail === "two-sided") {
      const c = jStat.studentt.inv(1 - alpha / 2, d);
      return { leftCritical: -c, rightCritical: c };
    }
    if (tail === "left-tailed") {
      return { leftCritical: jStat.studentt.inv(alpha, d) };
    }
    return { rightCritical: jStat.studentt.inv(1 - alpha, d) };
  }

  const d = df ?? 1;
  if (tail === "two-sided") {
    return {
      leftCritical: jStat.chisquare.inv(alpha / 2, d),
      rightCritical: jStat.chisquare.inv(1 - alpha / 2, d),
    };
  }
  if (tail === "left-tailed") {
    return { leftCritical: jStat.chisquare.inv(alpha, d) };
  }
  return { rightCritical: jStat.chisquare.inv(1 - alpha, d) };
}

function rejectionRegionText(
  statisticLabel: string,
  tail: TailType,
  leftCritical?: number,
  rightCritical?: number
) {
  if (tail === "two-sided") {
    return `Reject H₀ if ${statisticLabel} < ${fmt(leftCritical ?? NaN, 4)} or ${statisticLabel} > ${fmt(
      rightCritical ?? NaN,
      4
    )}.`;
  }
  if (tail === "left-tailed") {
    return `Reject H₀ if ${statisticLabel} < ${fmt(leftCritical ?? NaN, 4)}.`;
  }
  return `Reject H₀ if ${statisticLabel} > ${fmt(rightCritical ?? NaN, 4)}.`;
}

function decisionText(pValue: number, alpha: number) {
  if (pValue <= alpha) {
    return `Since p-value = ${fmt(pValue, 6)} ≤ α = ${fmt(alpha, 4)}, reject H₀.`;
  }
  return `Since p-value = ${fmt(pValue, 6)} > α = ${fmt(alpha, 4)}, fail to reject H₀.`;
}

function buildHypotheses(parameter: string, nullValue: number, tail: TailType) {
  if (tail === "two-sided") {
    return [`H₀: ${parameter} = ${fmt(nullValue, 4)}`, `H₁: ${parameter} ≠ ${fmt(nullValue, 4)}`];
  }
  if (tail === "left-tailed") {
    return [`H₀: ${parameter} = ${fmt(nullValue, 4)}`, `H₁: ${parameter} < ${fmt(nullValue, 4)}`];
  }
  return [`H₀: ${parameter} = ${fmt(nullValue, 4)}`, `H₁: ${parameter} > ${fmt(nullValue, 4)}`];
}

function buildSolutionText(result: TestResult) {
  return [
    result.title,
    "",
    "Generated Question:",
    result.question,
    "",
    "Hypotheses:",
    ...result.hypotheses,
    "",
    "Formula Used:",
    result.formulaText,
    "",
    "Critical Value Information:",
    result.criticalInfo,
    "",
    "How the Critical Value is Chosen:",
    ...result.criticalExplanation.map((x, i) => `${i + 1}. ${x}`),
    "",
    "Result Summary:",
    ...result.resultSummary.map((x, i) => `${i + 1}. ${x}`),
    "",
    "Rejection Region:",
    result.rejectionRegionText,
    "",
    "Decision:",
    result.decisionText,
    "",
    "Mathematical Steps:",
    ...result.steps.map((x, i) => `Step ${i + 1}: ${x}`),
    "",
    "Interpretation:",
    result.interpretation,
  ].join("\n");
}

function DistributionGraph({
  distribution,
  testStatistic,
  leftCritical,
  rightCritical,
  df,
  statisticLabel,
}: {
  distribution: "normal" | "t" | "chi-square";
  testStatistic: number;
  leftCritical?: number;
  rightCritical?: number;
  df?: number;
  statisticLabel: string;
}) {
  const width = 780;
  const height = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 38;

  let xMin = -4;
  let xMax = 4;

  if (distribution === "t") {
    xMin = -4.5;
    xMax = 4.5;
  }

  if (distribution === "chi-square") {
    xMin = 0;
    xMax = Math.max(20, (rightCritical ?? 10) * 1.3, testStatistic * 1.3, 12);
  }

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const baseY = padTop + plotHeight;

  function xScale(x: number) {
    return padLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(y: number, yMax: number) {
    return baseY - (y / yMax) * plotHeight;
  }

  function density(x: number) {
    if (distribution === "normal") return jStat.normal.pdf(x, 0, 1);
    if (distribution === "t") return jStat.studentt.pdf(x, df ?? 10);
    return jStat.chisquare.pdf(x, df ?? 10);
  }

  const samples: { x: number; y: number }[] = [];
  const nPts = 260;
  for (let i = 0; i <= nPts; i++) {
    const x = xMin + (i / nPts) * (xMax - xMin);
    samples.push({ x, y: density(x) });
  }

  const yMax = Math.max(...samples.map((p) => p.y)) * 1.15;

  const path = samples
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y, yMax)}`)
    .join(" ");

  function rejectionFillPath(side: "left" | "right") {
    const region =
      side === "left"
        ? samples.filter((p) => p.x <= (leftCritical ?? xMin))
        : samples.filter((p) => p.x >= (rightCritical ?? xMax));

    if (!region.length) return "";

    const startX = xScale(region[0].x);
    const endX = xScale(region[region.length - 1].x);

    const topPath = region
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y, yMax)}`)
      .join(" ");

    return `${topPath} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
  }

  const testX = xScale(testStatistic);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ maxWidth: "100%" }}>
        <line x1={padLeft} y1={baseY} x2={width - padRight} y2={baseY} stroke="#444" strokeWidth="2" />

        {leftCritical !== undefined && (
          <>
            <path d={rejectionFillPath("left")} fill="rgba(220, 53, 69, 0.18)" />
            <line
              x1={xScale(leftCritical)}
              y1={padTop}
              x2={xScale(leftCritical)}
              y2={baseY}
              stroke="#b00020"
              strokeDasharray="6 4"
              strokeWidth="2"
            />
            <text
              x={xScale(leftCritical)}
              y={baseY + 18}
              textAnchor="middle"
              fontSize="12"
              fill="#b00020"
            >
              {fmt(leftCritical, 4)}
            </text>
          </>
        )}

        {rightCritical !== undefined && (
          <>
            <path d={rejectionFillPath("right")} fill="rgba(220, 53, 69, 0.18)" />
            <line
              x1={xScale(rightCritical)}
              y1={padTop}
              x2={xScale(rightCritical)}
              y2={baseY}
              stroke="#b00020"
              strokeDasharray="6 4"
              strokeWidth="2"
            />
            <text
              x={xScale(rightCritical)}
              y={baseY + 18}
              textAnchor="middle"
              fontSize="12"
              fill="#b00020"
            >
              {fmt(rightCritical, 4)}
            </text>
          </>
        )}

        <path d={path} fill="none" stroke="#222" strokeWidth="3" />

        <line
          x1={testX}
          y1={padTop}
          x2={testX}
          y2={baseY}
          stroke="#0d6efd"
          strokeWidth="3"
        />
        <text x={testX} y={padTop + 12} textAnchor="middle" fontSize="12" fill="#0d6efd">
          {statisticLabel} = {fmt(testStatistic, 4)}
        </text>

        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="13" fontWeight="600">
          Graph of Test Statistic and Rejection Region
        </text>
      </svg>
    </div>
  );
}

export default function HypothesisTestingToolPage() {
  const [testType, setTestType] = useState<TestType>("one-sample-z");
  const [tailType, setTailType] = useState<TailType>("two-sided");
  const [inputMode, setInputMode] = useState<InputMode>("summary");
  const [alphaPercent, setAlphaPercent] = useState("5");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // Summary mode states
  const [mu0, setMu0] = useState("");
  const [p0, setP0] = useState("");
  const [sigma2Null, setSigma2Null] = useState("");

  const [xBar, setXBar] = useState("");
  const [sigma, setSigma] = useState("");
  const [s, setS] = useState("");
  const [n, setN] = useState("");
  const [x, setX] = useState("");

  const [xBar1, setXBar1] = useState("");
  const [xBar2, setXBar2] = useState("");
  const [sigma1, setSigma1] = useState("");
  const [sigma2, setSigma2] = useState("");
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [x1, setX1] = useState("");
  const [x2, setX2] = useState("");

  const [dBar, setDBar] = useState("");
  const [sd, setSd] = useState("");
  const [nd, setNd] = useState("");

  const [sampleVarianceValue, setSampleVarianceValue] = useState("");

  // Raw mode
  const [rawSampleA, setRawSampleA] = useState("");
  const [rawSampleB, setRawSampleB] = useState("");
  const [rawBinaryA, setRawBinaryA] = useState("");
  const [rawBinaryB, setRawBinaryB] = useState("");
  const [rawDiffs, setRawDiffs] = useState("");

  // Excel mode
  const [excelRows, setExcelRows] = useState<Record<string, unknown>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelColA, setExcelColA] = useState("");
  const [excelColB, setExcelColB] = useState("");

  function resetSubmitted() {
    setSubmitted(false);
    setCopied(false);
  }

  async function handleExcelUpload(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: "",
    });

    setExcelRows(json);
    setExcelHeaders(json.length ? Object.keys(json[0]) : []);
    setExcelFileName(file.name);

    const headers = json.length ? Object.keys(json[0]) : [];
    setExcelColA(headers[0] ?? "");
    setExcelColB(headers[1] ?? headers[0] ?? "");
    resetSubmitted();
  }

  const result = useMemo((): TestResult | null => {
    const alpha = alphaValue(toNum(alphaPercent));
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) return null;

    try {
      if (testType === "one-sample-z") {
        let meanValue = NaN;
        let sigmaValue = toNum(sigma);
        let nValue = NaN;
        const mu0Value = toNum(mu0);

        if (inputMode === "summary") {
          meanValue = toNum(xBar);
          nValue = toNum(n);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawSampleA);
          if (arr.length >= 1) {
            meanValue = mean(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 1) {
            meanValue = mean(arr);
            nValue = arr.length;
          }
        }

        if (
          ![meanValue, sigmaValue, nValue, mu0Value].every(Number.isFinite) ||
          sigmaValue <= 0 ||
          nValue <= 0
        ) {
          return null;
        }

        const z = (meanValue - mu0Value) / (sigmaValue / Math.sqrt(nValue));
        const pValue = normalPValue(z, tailType);
        const critical = getCriticalValues("normal", alpha, tailType);

        return {
          title: "One-Sample Z-Test",
          question: `A sample has mean x̄ = ${fmt(meanValue, 4)}, population standard deviation σ = ${fmt(
            sigmaValue,
            4
          )}, and sample size n = ${fmt(nValue, 0)}. Test the claim about the population mean at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("μ", mu0Value, tailType),
          formulaText: "z = (x̄ - μ₀) / (σ / √n)",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }`,
          resultSummary: [
            `Test statistic z = ${fmt(z, 6)}`,
            `P-value = ${fmt(pValue, 6)}`,
            `Significance level α = ${fmt(alpha, 4)}`,
          ],
          criticalExplanation: [
            `Since the population standard deviation is known, the z-distribution is used.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
            tailType === "two-sided"
              ? `For a two-sided test, α/2 = ${fmt(alpha / 2, 4)} is placed in each tail.`
              : `For a one-sided test, the full α = ${fmt(alpha, 4)} is placed in one tail.`,
          ],
          steps: [
            `State the hypotheses using μ₀ = ${fmt(mu0Value, 4)}.`,
            `Compute standard error: SE = ${fmt(sigmaValue, 6)} / √${fmt(nValue, 0)} = ${fmt(
              sigmaValue / Math.sqrt(nValue),
              6
            )}.`,
            `Compute test statistic: z = [${fmt(meanValue, 6)} - ${fmt(mu0Value, 6)}] / ${fmt(
              sigmaValue / Math.sqrt(nValue),
              6
            )} = ${fmt(z, 6)}.`,
            `Compute p-value from the standard normal distribution.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "z",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "z",
          statisticValue: z,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "normal",
            testStatistic: z,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
          },
        };
      }

      if (testType === "one-sample-t") {
        let meanValue = NaN;
        let sValue = NaN;
        let nValue = NaN;
        const mu0Value = toNum(mu0);

        if (inputMode === "summary") {
          meanValue = toNum(xBar);
          sValue = toNum(s);
          nValue = toNum(n);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawSampleA);
          if (arr.length >= 2) {
            meanValue = mean(arr);
            sValue = sampleStd(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 2) {
            meanValue = mean(arr);
            sValue = sampleStd(arr);
            nValue = arr.length;
          }
        }

        if (
          ![meanValue, sValue, nValue, mu0Value].every(Number.isFinite) ||
          sValue <= 0 ||
          nValue <= 1
        ) {
          return null;
        }

        const df = nValue - 1;
        const t = (meanValue - mu0Value) / (sValue / Math.sqrt(nValue));
        const pValue = tPValue(t, df, tailType);
        const critical = getCriticalValues("t", alpha, tailType, df);

        return {
          title: "One-Sample T-Test",
          question: `A sample has mean x̄ = ${fmt(meanValue, 4)}, sample standard deviation s = ${fmt(
            sValue,
            4
          )}, and sample size n = ${fmt(nValue, 0)}. Test the claim about the population mean at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("μ", mu0Value, tailType),
          formulaText: "t = (x̄ - μ₀) / (s / √n)",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}, with df = ${fmt(df, 0)}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }, with df = ${fmt(df, 0)}`,
          resultSummary: [
            `Test statistic t = ${fmt(t, 6)}`,
            `Degrees of freedom = ${fmt(df, 0)}`,
            `P-value = ${fmt(pValue, 6)}`,
            `Significance level α = ${fmt(alpha, 4)}`,
          ],
          criticalExplanation: [
            `Since the population standard deviation is unknown, the t-distribution is used.`,
            `Degrees of freedom are df = n - 1 = ${fmt(df, 0)}.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
          ],
          steps: [
            `State the hypotheses using μ₀ = ${fmt(mu0Value, 4)}.`,
            `Compute standard error: SE = ${fmt(sValue, 6)} / √${fmt(nValue, 0)} = ${fmt(
              sValue / Math.sqrt(nValue),
              6
            )}.`,
            `Compute test statistic: t = [${fmt(meanValue, 6)} - ${fmt(mu0Value, 6)}] / ${fmt(
              sValue / Math.sqrt(nValue),
              6
            )} = ${fmt(t, 6)}.`,
            `Compute p-value from the t-distribution with df = ${fmt(df, 0)}.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "t",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "t",
          statisticValue: t,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "t",
            testStatistic: t,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
            df,
          },
        };
      }

      if (testType === "one-proportion-z") {
        let xValue = NaN;
        let nValue = NaN;
        const p0Value = toNum(p0);

        if (inputMode === "summary") {
          xValue = toNum(x);
          nValue = toNum(n);
        } else if (inputMode === "raw") {
          const arr = parseBinaryList(rawBinaryA);
          if (arr.length >= 1) {
            xValue = sum(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getBinaryColumn(excelRows, excelColA);
          if (arr.length >= 1) {
            xValue = sum(arr);
            nValue = arr.length;
          }
        }

        if (
          ![xValue, nValue, p0Value].every(Number.isFinite) ||
          nValue <= 0 ||
          xValue < 0 ||
          xValue > nValue ||
          p0Value <= 0 ||
          p0Value >= 1
        ) {
          return null;
        }

        const pHat = xValue / nValue;
        const se = Math.sqrt((p0Value * (1 - p0Value)) / nValue);
        const z = (pHat - p0Value) / se;
        const pValue = normalPValue(z, tailType);
        const critical = getCriticalValues("normal", alpha, tailType);

        return {
          title: "One-Proportion Z-Test",
          question: `In a sample of size n = ${fmt(nValue, 0)}, there are x = ${fmt(
            xValue,
            0
          )} successes. Test the claim about the population proportion at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("p", p0Value, tailType),
          formulaText: "z = (p̂ - p₀) / √[ p₀(1-p₀) / n ]",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }`,
          resultSummary: [
            `Sample proportion p̂ = ${fmt(pHat, 6)}`,
            `Test statistic z = ${fmt(z, 6)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `A proportion test uses the z-distribution.`,
            `The standard error is computed under the null hypothesis using p₀.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
          ],
          steps: [
            `Compute p̂ = x / n = ${fmt(xValue, 0)} / ${fmt(nValue, 0)} = ${fmt(pHat, 6)}.`,
            `Compute SE = √[ ${fmt(p0Value, 6)}(1 - ${fmt(p0Value, 6)}) / ${fmt(nValue, 0)} ] = ${fmt(
              se,
              6
            )}.`,
            `Compute test statistic: z = [${fmt(pHat, 6)} - ${fmt(p0Value, 6)}] / ${fmt(
              se,
              6
            )} = ${fmt(z, 6)}.`,
            `Compute p-value from the standard normal distribution.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "z",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "z",
          statisticValue: z,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "normal",
            testStatistic: z,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
          },
        };
      }

      if (testType === "two-sample-z") {
        let m1 = NaN;
        let m2 = NaN;
        let sig1 = toNum(sigma1);
        let sig2 = toNum(sigma2);
        let N1 = NaN;
        let N2 = NaN;
        const mu0Value = toNum(mu0);

        if (inputMode === "summary") {
          m1 = toNum(xBar1);
          m2 = toNum(xBar2);
          N1 = toNum(n1);
          N2 = toNum(n2);
        } else if (inputMode === "raw") {
          const a = parseNumericList(rawSampleA);
          const b = parseNumericList(rawSampleB);
          if (a.length >= 1 && b.length >= 1) {
            m1 = mean(a);
            m2 = mean(b);
            N1 = a.length;
            N2 = b.length;
          }
        } else {
          const a = getNumericColumn(excelRows, excelColA);
          const b = getNumericColumn(excelRows, excelColB);
          if (a.length >= 1 && b.length >= 1) {
            m1 = mean(a);
            m2 = mean(b);
            N1 = a.length;
            N2 = b.length;
          }
        }

        if (
          ![m1, m2, sig1, sig2, N1, N2, mu0Value].every(Number.isFinite) ||
          sig1 <= 0 ||
          sig2 <= 0 ||
          N1 <= 0 ||
          N2 <= 0
        ) {
          return null;
        }

        const diff = m1 - m2;
        const se = Math.sqrt(sig1 ** 2 / N1 + sig2 ** 2 / N2);
        const z = (diff - mu0Value) / se;
        const pValue = normalPValue(z, tailType);
        const critical = getCriticalValues("normal", alpha, tailType);

        return {
          title: "Two-Sample Z-Test",
          question: `Two independent samples are given. Test the claim about the difference of population means at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("μ₁ - μ₂", mu0Value, tailType),
          formulaText: "z = [ (x̄₁ - x̄₂) - (μ₁ - μ₂)₀ ] / √(σ₁²/n₁ + σ₂²/n₂)",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }`,
          resultSummary: [
            `Difference in sample means = ${fmt(diff, 6)}`,
            `Test statistic z = ${fmt(z, 6)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `Since both population standard deviations are known, the z-distribution is used.`,
            `The null difference is ${(mu0Value >= 0 ? "" : "-")}${fmt(Math.abs(mu0Value), 4)}.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
          ],
          steps: [
            `Compute x̄₁ - x̄₂ = ${fmt(m1, 6)} - ${fmt(m2, 6)} = ${fmt(diff, 6)}.`,
            `Compute standard error: SE = √(${fmt(sig1 ** 2, 6)}/${fmt(
              N1,
              0
            )} + ${fmt(sig2 ** 2, 6)}/${fmt(N2, 0)}) = ${fmt(se, 6)}.`,
            `Compute z = [${fmt(diff, 6)} - ${fmt(mu0Value, 6)}] / ${fmt(se, 6)} = ${fmt(z, 6)}.`,
            `Compute p-value from the standard normal distribution.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "z",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "z",
          statisticValue: z,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "normal",
            testStatistic: z,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
          },
        };
      }

      if (testType === "two-sample-t") {
        let m1 = NaN;
        let m2 = NaN;
        let sd1 = NaN;
        let sd2 = NaN;
        let N1 = NaN;
        let N2 = NaN;
        const mu0Value = toNum(mu0);

        if (inputMode === "summary") {
          m1 = toNum(xBar1);
          m2 = toNum(xBar2);
          sd1 = toNum(s1);
          sd2 = toNum(s2);
          N1 = toNum(n1);
          N2 = toNum(n2);
        } else if (inputMode === "raw") {
          const a = parseNumericList(rawSampleA);
          const b = parseNumericList(rawSampleB);
          if (a.length >= 2 && b.length >= 2) {
            m1 = mean(a);
            m2 = mean(b);
            sd1 = sampleStd(a);
            sd2 = sampleStd(b);
            N1 = a.length;
            N2 = b.length;
          }
        } else {
          const a = getNumericColumn(excelRows, excelColA);
          const b = getNumericColumn(excelRows, excelColB);
          if (a.length >= 2 && b.length >= 2) {
            m1 = mean(a);
            m2 = mean(b);
            sd1 = sampleStd(a);
            sd2 = sampleStd(b);
            N1 = a.length;
            N2 = b.length;
          }
        }

        if (
          ![m1, m2, sd1, sd2, N1, N2, mu0Value].every(Number.isFinite) ||
          sd1 <= 0 ||
          sd2 <= 0 ||
          N1 <= 1 ||
          N2 <= 1
        ) {
          return null;
        }

        const diff = m1 - m2;
        const v1 = sd1 ** 2 / N1;
        const v2 = sd2 ** 2 / N2;
        const se = Math.sqrt(v1 + v2);
        const df = ((v1 + v2) ** 2) / ((v1 ** 2) / (N1 - 1) + (v2 ** 2) / (N2 - 1));
        const t = (diff - mu0Value) / se;
        const pValue = tPValue(t, df, tailType);
        const critical = getCriticalValues("t", alpha, tailType, df);

        return {
          title: "Two-Sample T-Test (Welch)",
          question: `Two independent samples are given. Test the claim about the difference of population means at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("μ₁ - μ₂", mu0Value, tailType),
          formulaText: "t = [ (x̄₁ - x̄₂) - (μ₁ - μ₂)₀ ] / √(s₁²/n₁ + s₂²/n₂)",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}, Welch df ≈ ${fmt(df, 4)}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }, Welch df ≈ ${fmt(df, 4)}`,
          resultSummary: [
            `Difference in sample means = ${fmt(diff, 6)}`,
            `Test statistic t = ${fmt(t, 6)}`,
            `Welch df ≈ ${fmt(df, 4)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `Population standard deviations are unknown, so a t-test is used.`,
            `This version uses Welch's t-test, which does not assume equal variances.`,
            `The degrees of freedom are approximated by the Welch-Satterthwaite formula.`,
          ],
          steps: [
            `Compute x̄₁ - x̄₂ = ${fmt(m1, 6)} - ${fmt(m2, 6)} = ${fmt(diff, 6)}.`,
            `Compute standard error: SE = √(${fmt(sd1 ** 2, 6)}/${fmt(N1, 0)} + ${fmt(
              sd2 ** 2,
              6
            )}/${fmt(N2, 0)}) = ${fmt(se, 6)}.`,
            `Compute t = [${fmt(diff, 6)} - ${fmt(mu0Value, 6)}] / ${fmt(se, 6)} = ${fmt(t, 6)}.`,
            `Compute Welch degrees of freedom ≈ ${fmt(df, 4)}.`,
            `Compute p-value from the t-distribution.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "t",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "t",
          statisticValue: t,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "t",
            testStatistic: t,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
            df,
          },
        };
      }

      if (testType === "paired-t") {
        let dMean = NaN;
        let dSd = NaN;
        let dN = NaN;
        const mu0Value = toNum(mu0);

        if (inputMode === "summary") {
          dMean = toNum(dBar);
          dSd = toNum(sd);
          dN = toNum(nd);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawDiffs);
          if (arr.length >= 2) {
            dMean = mean(arr);
            dSd = sampleStd(arr);
            dN = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 2) {
            dMean = mean(arr);
            dSd = sampleStd(arr);
            dN = arr.length;
          }
        }

        if (
          ![dMean, dSd, dN, mu0Value].every(Number.isFinite) ||
          dSd <= 0 ||
          dN <= 1
        ) {
          return null;
        }

        const df = dN - 1;
        const t = (dMean - mu0Value) / (dSd / Math.sqrt(dN));
        const pValue = tPValue(t, df, tailType);
        const critical = getCriticalValues("t", alpha, tailType, df);

        return {
          title: "Paired T-Test",
          question: `For paired data, the sample mean difference is d̄ = ${fmt(
            dMean,
            4
          )}, the sample standard deviation of differences is s_d = ${fmt(
            dSd,
            4
          )}, and the number of pairs is n = ${fmt(dN, 0)}. Test the claim about the population mean difference at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("μ_d", mu0Value, tailType),
          formulaText: "t = (d̄ - μ_d₀) / (s_d / √n)",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}, with df = ${fmt(df, 0)}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }, with df = ${fmt(df, 0)}`,
          resultSummary: [
            `Mean difference d̄ = ${fmt(dMean, 6)}`,
            `Test statistic t = ${fmt(t, 6)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `Paired data are converted into one sample of differences.`,
            `Because the standard deviation of differences is unknown, the t-distribution is used.`,
            `Degrees of freedom are df = n - 1 = ${fmt(df, 0)}.`,
          ],
          steps: [
            `Use the differences and test μ_d against μ_d₀ = ${fmt(mu0Value, 4)}.`,
            `Compute standard error: SE = ${fmt(dSd, 6)} / √${fmt(dN, 0)} = ${fmt(
              dSd / Math.sqrt(dN),
              6
            )}.`,
            `Compute t = [${fmt(dMean, 6)} - ${fmt(mu0Value, 6)}] / ${fmt(
              dSd / Math.sqrt(dN),
              6
            )} = ${fmt(t, 6)}.`,
            `Compute p-value from the t-distribution.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "t",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "t",
          statisticValue: t,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "t",
            testStatistic: t,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
            df,
          },
        };
      }

      if (testType === "two-proportion-z") {
        let x1Value = NaN;
        let x2Value = NaN;
        let n1Value = NaN;
        let n2Value = NaN;
        const p0Value = toNum(p0);

        if (inputMode === "summary") {
          x1Value = toNum(x1);
          x2Value = toNum(x2);
          n1Value = toNum(n1);
          n2Value = toNum(n2);
        } else if (inputMode === "raw") {
          const a = parseBinaryList(rawBinaryA);
          const b = parseBinaryList(rawBinaryB);
          if (a.length >= 1 && b.length >= 1) {
            x1Value = sum(a);
            x2Value = sum(b);
            n1Value = a.length;
            n2Value = b.length;
          }
        } else {
          const a = getBinaryColumn(excelRows, excelColA);
          const b = getBinaryColumn(excelRows, excelColB);
          if (a.length >= 1 && b.length >= 1) {
            x1Value = sum(a);
            x2Value = sum(b);
            n1Value = a.length;
            n2Value = b.length;
          }
        }

        if (
          ![x1Value, x2Value, n1Value, n2Value, p0Value].every(Number.isFinite) ||
          n1Value <= 0 ||
          n2Value <= 0 ||
          x1Value < 0 ||
          x1Value > n1Value ||
          x2Value < 0 ||
          x2Value > n2Value
        ) {
          return null;
        }

        const p1Hat = x1Value / n1Value;
        const p2Hat = x2Value / n2Value;
        const diff = p1Hat - p2Hat;
        const pooled = (x1Value + x2Value) / (n1Value + n2Value);
        const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1Value + 1 / n2Value));
        const z = (diff - p0Value) / se;
        const pValue = normalPValue(z, tailType);
        const critical = getCriticalValues("normal", alpha, tailType);

        return {
          title: "Two-Proportion Z-Test",
          question: `Two samples are given with successes x₁ = ${fmt(x1Value, 0)}, n₁ = ${fmt(
            n1Value,
            0
          )}, and x₂ = ${fmt(x2Value, 0)}, n₂ = ${fmt(n2Value, 0)}. Test the claim about the difference of population proportions at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("p₁ - p₂", p0Value, tailType),
          formulaText:
            "z = [ (p̂₁ - p̂₂) - (p₁ - p₂)₀ ] / √[ p̄(1-p̄)(1/n₁ + 1/n₂) ]",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }`,
          resultSummary: [
            `p̂₁ = ${fmt(p1Hat, 6)}`,
            `p̂₂ = ${fmt(p2Hat, 6)}`,
            `Pooled proportion p̄ = ${fmt(pooled, 6)}`,
            `Test statistic z = ${fmt(z, 6)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `A two-proportion test uses the z-distribution.`,
            `For hypothesis testing, the pooled proportion p̄ is used in the standard error.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
          ],
          steps: [
            `Compute p̂₁ = ${fmt(x1Value, 0)} / ${fmt(n1Value, 0)} = ${fmt(p1Hat, 6)}.`,
            `Compute p̂₂ = ${fmt(x2Value, 0)} / ${fmt(n2Value, 0)} = ${fmt(p2Hat, 6)}.`,
            `Compute pooled proportion p̄ = (${fmt(x1Value, 0)} + ${fmt(x2Value, 0)}) / (${fmt(
              n1Value,
              0
            )} + ${fmt(n2Value, 0)}) = ${fmt(pooled, 6)}.`,
            `Compute standard error: SE = ${fmt(se, 6)}.`,
            `Compute z = [${fmt(diff, 6)} - ${fmt(p0Value, 6)}] / ${fmt(se, 6)} = ${fmt(z, 6)}.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "z",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "z",
          statisticValue: z,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "normal",
            testStatistic: z,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
          },
        };
      }

      if (testType === "chi-square-variance") {
        let s2Value = NaN;
        let nValue = NaN;
        const sigma20 = toNum(sigma2Null);

        if (inputMode === "summary") {
          s2Value = toNum(sampleVarianceValue);
          nValue = toNum(n);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawSampleA);
          if (arr.length >= 2) {
            s2Value = sampleVariance(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 2) {
            s2Value = sampleVariance(arr);
            nValue = arr.length;
          }
        }

        if (
          ![s2Value, nValue, sigma20].every(Number.isFinite) ||
          s2Value <= 0 ||
          nValue <= 1 ||
          sigma20 <= 0
        ) {
          return null;
        }

        const df = nValue - 1;
        const chi = (df * s2Value) / sigma20;
        const pValue = chiSquarePValue(chi, df, tailType);
        const critical = getCriticalValues("chi-square", alpha, tailType, df);

        return {
          title: "Chi-Square Variance Test",
          question: `A sample has variance s² = ${fmt(s2Value, 4)} and sample size n = ${fmt(
            nValue,
            0
          )}. Test the claim about the population variance at significance level α = ${fmt(
            alpha,
            4
          )}.`,
          hypotheses: buildHypotheses("σ²", sigma20, tailType),
          formulaText: "χ² = (n - 1)s² / σ₀²",
          criticalInfo:
            tailType === "two-sided"
              ? `Critical values: ${fmt(critical.leftCritical ?? NaN, 4)} and ${fmt(
                  critical.rightCritical ?? NaN,
                  4
                )}, with df = ${fmt(df, 0)}`
              : `Critical value: ${
                  tailType === "left-tailed"
                    ? fmt(critical.leftCritical ?? NaN, 4)
                    : fmt(critical.rightCritical ?? NaN, 4)
                }, with df = ${fmt(df, 0)}`,
          resultSummary: [
            `Sample variance s² = ${fmt(s2Value, 6)}`,
            `Test statistic χ² = ${fmt(chi, 6)}`,
            `Degrees of freedom = ${fmt(df, 0)}`,
            `P-value = ${fmt(pValue, 6)}`,
          ],
          criticalExplanation: [
            `A test for one population variance uses the chi-square distribution.`,
            `Degrees of freedom are df = n - 1 = ${fmt(df, 0)}.`,
            `The chosen significance level is α = ${fmt(alpha, 4)}.`,
          ],
          steps: [
            `State the hypotheses using σ₀² = ${fmt(sigma20, 6)}.`,
            `Compute χ² = [(${fmt(df, 0)})(${fmt(s2Value, 6)})] / ${fmt(sigma20, 6)} = ${fmt(
              chi,
              6
            )}.`,
            `Compute p-value from the chi-square distribution with df = ${fmt(df, 0)}.`,
          ],
          rejectionRegionText: rejectionRegionText(
            "χ²",
            tailType,
            critical.leftCritical,
            critical.rightCritical
          ),
          decisionText: decisionText(pValue, alpha),
          interpretation:
            pValue <= alpha
              ? "There is sufficient evidence to reject the null hypothesis."
              : "There is not sufficient evidence to reject the null hypothesis.",
          statisticLabel: "χ²",
          statisticValue: chi,
          pValue,
          alpha,
          tailType,
          graph: {
            distribution: "chi-square",
            testStatistic: chi,
            leftCritical: critical.leftCritical,
            rightCritical: critical.rightCritical,
            df,
          },
        };
      }

      return null;
    } catch {
      return null;
    }
  }, [
    testType,
    tailType,
    inputMode,
    alphaPercent,
    mu0,
    p0,
    sigma2Null,
    xBar,
    sigma,
    s,
    n,
    x,
    xBar1,
    xBar2,
    sigma1,
    sigma2,
    s1,
    s2,
    n1,
    n2,
    x1,
    x2,
    dBar,
    sd,
    nd,
    sampleVarianceValue,
    rawSampleA,
    rawSampleB,
    rawBinaryA,
    rawBinaryB,
    rawDiffs,
    excelRows,
    excelColA,
    excelColB,
  ]);

  async function copySolution() {
    if (!result) return;
    await navigator.clipboard.writeText(buildSolutionText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function exportPDF() {
    if (!resultRef.current) return;

    const canvas = await html2canvas(resultRef.current, {
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

    pdf.save("hypothesis-testing-solution.pdf");
  }

  function renderSummaryInputs() {
    switch (testType) {
      case "one-sample-z":
        return (
          <InputGrid>
            <Input label="Null mean, μ₀" value={mu0} onChange={setMu0} />
            <Input label="Sample mean, x̄" value={xBar} onChange={setXBar} />
            <Input label="Population standard deviation, σ" value={sigma} onChange={setSigma} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "one-sample-t":
        return (
          <InputGrid>
            <Input label="Null mean, μ₀" value={mu0} onChange={setMu0} />
            <Input label="Sample mean, x̄" value={xBar} onChange={setXBar} />
            <Input label="Sample standard deviation, s" value={s} onChange={setS} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "one-proportion-z":
        return (
          <InputGrid>
            <Input label="Null proportion, p₀" value={p0} onChange={setP0} />
            <Input label="Number of successes, x" value={x} onChange={setX} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "two-sample-z":
        return (
          <InputGrid>
            <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
            <Input label="Sample 1 mean, x̄₁" value={xBar1} onChange={setXBar1} />
            <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Sample 2 mean, x̄₂" value={xBar2} onChange={setXBar2} />
            <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "two-sample-t":
        return (
          <InputGrid>
            <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
            <Input label="Sample 1 mean, x̄₁" value={xBar1} onChange={setXBar1} />
            <Input label="Sample SD 1, s₁" value={s1} onChange={setS1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Sample 2 mean, x̄₂" value={xBar2} onChange={setXBar2} />
            <Input label="Sample SD 2, s₂" value={s2} onChange={setS2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "paired-t":
        return (
          <InputGrid>
            <Input label="Null mean difference, μ_d₀" value={mu0} onChange={setMu0} />
            <Input label="Mean of differences, d̄" value={dBar} onChange={setDBar} />
            <Input label="SD of differences, s_d" value={sd} onChange={setSd} />
            <Input label="Number of pairs, n" value={nd} onChange={setNd} />
          </InputGrid>
        );

      case "two-proportion-z":
        return (
          <InputGrid>
            <Input label="Null difference, (p₁-p₂)₀" value={p0} onChange={setP0} />
            <Input label="Successes in sample 1, x₁" value={x1} onChange={setX1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Successes in sample 2, x₂" value={x2} onChange={setX2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "chi-square-variance":
        return (
          <InputGrid>
            <Input label="Null variance, σ₀²" value={sigma2Null} onChange={setSigma2Null} />
            <Input label="Sample variance, s²" value={sampleVarianceValue} onChange={setSampleVarianceValue} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      default:
        return null;
    }
  }

  function renderRawInputs() {
    switch (testType) {
      case "one-sample-z":
        return (
          <>
            <InputGrid>
              <Input label="Null mean, μ₀" value={mu0} onChange={setMu0} />
              <Input label="Population standard deviation, σ" value={sigma} onChange={setSigma} />
            </InputGrid>
            <TextAreaInput
              label="Raw numeric sample data"
              value={rawSampleA}
              onChange={setRawSampleA}
              placeholder="Example: 12, 15, 18, 20, 19"
            />
          </>
        );

      case "one-sample-t":
      case "chi-square-variance":
        return (
          <>
            <Input label={testType === "one-sample-t" ? "Null mean, μ₀" : "Null variance, σ₀²"} value={testType === "one-sample-t" ? mu0 : sigma2Null} onChange={testType === "one-sample-t" ? setMu0 : setSigma2Null} />
            <TextAreaInput
              label="Raw numeric sample data"
              value={rawSampleA}
              onChange={setRawSampleA}
              placeholder="Example: 12, 15, 18, 20, 19"
            />
          </>
        );

      case "one-proportion-z":
        return (
          <>
            <Input label="Null proportion, p₀" value={p0} onChange={setP0} />
            <TextAreaInput
              label="Raw binary data"
              value={rawBinaryA}
              onChange={setRawBinaryA}
              placeholder="Example: 1, 0, 1, 1, 0 or yes, no, yes"
            />
          </>
        );

      case "two-sample-z":
        return (
          <>
            <InputGrid>
              <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
              <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
              <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
            </InputGrid>
            <InputGrid>
              <TextAreaInput
                label="Raw numeric sample 1"
                value={rawSampleA}
                onChange={setRawSampleA}
                placeholder="Example: 12, 15, 18, 20"
              />
              <TextAreaInput
                label="Raw numeric sample 2"
                value={rawSampleB}
                onChange={setRawSampleB}
                placeholder="Example: 10, 11, 14, 16"
              />
            </InputGrid>
          </>
        );

      case "two-sample-t":
        return (
          <>
            <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
            <InputGrid>
              <TextAreaInput
                label="Raw numeric sample 1"
                value={rawSampleA}
                onChange={setRawSampleA}
                placeholder="Example: 12, 15, 18, 20"
              />
              <TextAreaInput
                label="Raw numeric sample 2"
                value={rawSampleB}
                onChange={setRawSampleB}
                placeholder="Example: 10, 11, 14, 16"
              />
            </InputGrid>
          </>
        );

      case "paired-t":
        return (
          <>
            <Input label="Null mean difference, μ_d₀" value={mu0} onChange={setMu0} />
            <TextAreaInput
              label="Raw paired differences"
              value={rawDiffs}
              onChange={setRawDiffs}
              placeholder="Example: 2, -1, 3, 4, 0, 1"
            />
          </>
        );

      case "two-proportion-z":
        return (
          <>
            <Input label="Null difference, (p₁-p₂)₀" value={p0} onChange={setP0} />
            <InputGrid>
              <TextAreaInput
                label="Raw binary sample 1"
                value={rawBinaryA}
                onChange={setRawBinaryA}
                placeholder="Example: 1, 0, 1, 1, 0"
              />
              <TextAreaInput
                label="Raw binary sample 2"
                value={rawBinaryB}
                onChange={setRawBinaryB}
                placeholder="Example: 0, 1, 0, 1, 1"
              />
            </InputGrid>
          </>
        );

      default:
        return null;
    }
  }

  function renderExcelInputs() {
    return (
      <>
        <div
          style={{
            border: "1px dashed #bbb",
            borderRadius: 10,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <label style={labelStyle}>Upload Excel file (.xlsx, .xls, .csv)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleExcelUpload(file);
            }}
          />
          {excelFileName && (
            <p style={{ marginTop: 10, marginBottom: 0, color: "#555" }}>
              Uploaded file: <strong>{excelFileName}</strong>
            </p>
          )}
        </div>

        {excelHeaders.length > 0 && (
          <>
            {(testType === "one-sample-z" ||
              testType === "one-sample-t" ||
              testType === "one-proportion-z" ||
              testType === "paired-t" ||
              testType === "chi-square-variance") && (
              <InputGrid>
                <Select
                  label="Select column"
                  value={excelColA}
                  onChange={(v) => {
                    setExcelColA(v);
                    resetSubmitted();
                  }}
                  options={excelHeaders.map((h) => [h, h])}
                />
              </InputGrid>
            )}

            {(testType === "two-sample-z" ||
              testType === "two-sample-t" ||
              testType === "two-proportion-z") && (
              <InputGrid>
                <Select
                  label="Column A"
                  value={excelColA}
                  onChange={(v) => {
                    setExcelColA(v);
                    resetSubmitted();
                  }}
                  options={excelHeaders.map((h) => [h, h])}
                />
                <Select
                  label="Column B"
                  value={excelColB}
                  onChange={(v) => {
                    setExcelColB(v);
                    resetSubmitted();
                  }}
                  options={excelHeaders.map((h) => [h, h])}
                />
              </InputGrid>
            )}

            <InputGrid>
              {(testType === "one-sample-z" || testType === "one-sample-t") && (
                <Input label="Null mean, μ₀" value={mu0} onChange={setMu0} />
              )}

              {testType === "one-sample-z" && (
                <Input label="Population standard deviation, σ" value={sigma} onChange={setSigma} />
              )}

              {testType === "one-proportion-z" && (
                <Input label="Null proportion, p₀" value={p0} onChange={setP0} />
              )}

              {testType === "two-sample-z" && (
                <>
                  <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
                  <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
                  <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
                </>
              )}

              {testType === "two-sample-t" && (
                <Input label="Null difference, (μ₁-μ₂)₀" value={mu0} onChange={setMu0} />
              )}

              {testType === "paired-t" && (
                <Input label="Null mean difference, μ_d₀" value={mu0} onChange={setMu0} />
              )}

              {testType === "two-proportion-z" && (
                <Input label="Null difference, (p₁-p₂)₀" value={p0} onChange={setP0} />
              )}

              {testType === "chi-square-variance" && (
                <Input label="Null variance, σ₀²" value={sigma2Null} onChange={setSigma2Null} />
              )}
            </InputGrid>
          </>
        )}
      </>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1120, padding: "40px 20px",background: "#ebca14", borderRadius: 12 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
        Hypothesis Testing Tool
      </h1>

      <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 24 }}>
        Perform common hypothesis tests and obtain test statistics, p-values, rejection regions,
        and decision summaries. This version supports summary input, manual raw data entry,
        Excel upload, copy solution, PDF export, and a graph of the test statistic and rejection region.
      </p>

      <SectionCard title="Choose Test Settings">
        <InputGrid>
          <Select
            label="Test type"
            value={testType}
            onChange={(v) => {
              setTestType(v as TestType);
              resetSubmitted();
            }}
            options={[
              ["one-sample-z", "One-sample z-test"],
              ["one-sample-t", "One-sample t-test"],
              ["one-proportion-z", "One-proportion z-test"],
              ["two-sample-z", "Two-sample z-test"],
              ["two-sample-t", "Two-sample t-test"],
              ["paired-t", "Paired t-test"],
              ["two-proportion-z", "Two-proportion z-test"],
              ["chi-square-variance", "Chi-square variance test"],
            ]}
          />

          <Select
            label="Alternative hypothesis"
            value={tailType}
            onChange={(v) => {
              setTailType(v as TailType);
              resetSubmitted();
            }}
            options={[
              ["two-sided", "Two-sided"],
              ["left-tailed", "Left-tailed"],
              ["right-tailed", "Right-tailed"],
            ]}
          />

          <Select
            label="Input mode"
            value={inputMode}
            onChange={(v) => {
              setInputMode(v as InputMode);
              resetSubmitted();
            }}
            options={[
              ["summary", "Summary input"],
              ["raw", "Manual raw data entry"],
              ["excel", "Excel upload"],
            ]}
          />

          <Input label="Significance level, α (%)" value={alphaPercent} onChange={setAlphaPercent} />
        </InputGrid>
      </SectionCard>

      <SectionCard title="Enter Data">
        {inputMode === "summary" && renderSummaryInputs()}
        {inputMode === "raw" && renderRawInputs()}
        {inputMode === "excel" && renderExcelInputs()}

        <div style={{ marginTop: 20 }}>
          <button onClick={() => setSubmitted(true)} style={primaryButtonStyle}>
            Run Hypothesis Test
          </button>
        </div>

        {submitted && !result && (
          <p style={{ color: "crimson", marginTop: 14 }}>
            Please enter valid values for the selected test and input mode.
          </p>
        )}
      </SectionCard>

      {submitted && result && (
        <div ref={resultRef}>
          <SectionCard title="Generated Question">
            <p style={{ lineHeight: 1.8 }}>{result.question}</p>
          </SectionCard>

          <SectionCard title="Hypotheses">
            {result.hypotheses.map((h, i) => (
              <div key={i} style={{ marginBottom: 8, fontSize: "1.02rem" }}>
                <strong>{i === 0 ? "Null hypothesis:" : "Alternative hypothesis:"}</strong> {h}
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Formula Used">
            <div style={mathBoxStyle}>{result.formulaText}</div>
            <div style={{ marginTop: 12 }}>
              <strong>Critical value information:</strong> {result.criticalInfo}
            </div>
          </SectionCard>

          <SectionCard title="How the Critical Value is Chosen">
            {result.criticalExplanation.map((item, index) => (
              <StepBlock key={index} title={`Point ${index + 1}`}>
                {item}
              </StepBlock>
            ))}
          </SectionCard>

          <SectionCard title="Result Summary">
            {result.resultSummary.map((item, index) => (
              <div key={index} style={{ marginBottom: 10 }}>
                <strong>{index + 1}.</strong> {item}
              </div>
            ))}

            <div style={{ marginTop: 12, marginBottom: 10 }}>
              <strong>Rejection region:</strong> {result.rejectionRegionText}
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong>Decision:</strong> {result.decisionText}
            </div>

            <div
              style={{
                marginTop: 16,
                background: "#fff9e6",
                border: "1px solid #f3d46b",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <strong>Interpretation:</strong>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{result.interpretation}</p>
            </div>
          </SectionCard>

          <SectionCard title="Mathematical Steps with Clear Explanations">
            {result.steps.map((step, index) => (
              <StepBlock key={index} title={`Step ${index + 1}`}>
                {step}
              </StepBlock>
            ))}
          </SectionCard>

          <SectionCard title="Graph of the Test Statistic and Rejection Region">
            <DistributionGraph
              distribution={result.graph.distribution}
              testStatistic={result.graph.testStatistic}
              leftCritical={result.graph.leftCritical}
              rightCritical={result.graph.rightCritical}
              df={result.graph.df}
              statisticLabel={result.statisticLabel}
            />
          </SectionCard>
        </div>
      )}

      {submitted && result && (
        <SectionCard title="Actions">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={copySolution} style={secondaryButtonStyle}>
              {copied ? "Copied" : "Copy Solution"}
            </button>
            <button onClick={exportPDF} style={secondaryButtonStyle}>
              Export PDF
            </button>
          </div>
        </SectionCard>
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

function StepBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 14,
        background: "#fcfcfc",
        border: "1px solid #eee",
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <strong>{title}:</strong>
      <div style={{ marginTop: 6, lineHeight: 1.8 }}>{children}</div>
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

function Input({
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
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          resize: "vertical",
          minHeight: 130,
        }}
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
  options: [string, string][];
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

const mathBoxStyle: React.CSSProperties = {
  background: "#f8f8f8",
  borderRadius: 8,
  padding: "14px 16px",
  fontSize: "1.05rem",
  fontWeight: 500,
  lineHeight: 1.8,
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