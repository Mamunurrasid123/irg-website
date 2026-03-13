"use client";

import React, { useMemo, useRef, useState } from "react";
import { jStat } from "jstat";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type IntervalType =
  | "one-mean-known-sigma"
  | "one-mean-unknown-sigma"
  | "one-proportion"
  | "two-means-known-sigmas"
  | "two-means-unknown-equal"
  | "two-means-unknown-unequal"
  | "paired-mean"
  | "two-proportions"
  | "one-variance"
  | "ratio-variances";

type InputMode = "summary" | "raw" | "excel";

type ResultBlock = {
  title: string;
  question: string;
  formulaText: string;
  criticalValueText: string;
  resultSummary: string[];
  criticalExplanation: string[];
  steps: string[];
  interpretation: string;
  interval?: {
    lower: number;
    upper: number;
    center: number;
    label: string;
  };
};

function toNum(value: string) {
  const x = parseFloat(value);
  return Number.isFinite(x) ? x : NaN;
}

function fmt(x: number, d = 6) {
  return Number.isFinite(x) ? x.toFixed(d) : "";
}

function alphaFromCL(confidenceLevel: number) {
  return 1 - confidenceLevel / 100;
}

function zCritical(confidenceLevel: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.normal.inv(1 - alpha / 2, 0, 1);
}

function tCritical(confidenceLevel: number, df: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.studentt.inv(1 - alpha / 2, df);
}

function chiSqLeft(confidenceLevel: number, df: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.chisquare.inv(alpha / 2, df);
}

function chiSqRight(confidenceLevel: number, df: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.chisquare.inv(1 - alpha / 2, df);
}

function fLeft(confidenceLevel: number, df1: number, df2: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.centralF.inv(alpha / 2, df1, df2);
}

function fRight(confidenceLevel: number, df1: number, df2: number) {
  const alpha = alphaFromCL(confidenceLevel);
  return jStat.centralF.inv(1 - alpha / 2, df1, df2);
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
  return (
    arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1)
  );
}

function sampleStd(arr: number[]) {
  return Math.sqrt(sampleVariance(arr));
}

function proportionSuccesses(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function getNumericColumn(rows: Record<string, unknown>[], col: string) {
  return rows
    .map((r) => Number(r[col]))
    .filter((v) => Number.isFinite(v));
}

function getBinaryColumn(rows: Record<string, unknown>[], col: string) {
  return rows
    .map((r) => parseBinaryValue(r[col]))
    .filter((v): v is number => v === 0 || v === 1);
}

function buildSolutionText(result: ResultBlock) {
  return [
    result.title,
    "",
    "Generated Question:",
    result.question,
    "",
    "Formula Used:",
    result.formulaText,
    "",
    "Critical Value:",
    result.criticalValueText,
    "",
    "How the Critical Value is Chosen:",
    ...result.criticalExplanation.map((x, i) => `${i + 1}. ${x}`),
    "",
    "Result Summary:",
    ...result.resultSummary.map((x, i) => `${i + 1}. ${x}`),
    "",
    "Mathematical Steps:",
    ...result.steps.map((x, i) => `Step ${i + 1}: ${x}`),
    "",
    "Interpretation:",
    result.interpretation,
  ].join("\n");
}

function IntervalGraph({
  lower,
  upper,
  center,
  label,
}: {
  lower: number;
  upper: number;
  center: number;
  label: string;
}) {
  const width = 760;
  const height = 130;
  const pad = 70;

  const spread = Math.max(Math.abs(upper - lower), Math.abs(center), 1);
  const min = Math.min(lower, center) - 0.35 * spread;
  const max = Math.max(upper, center) + 0.35 * spread;

  const xPos = (x: number) => {
    if (max === min) return width / 2;
    return pad + ((x - min) / (max - min)) * (width - 2 * pad);
  };

  const xL = xPos(lower);
  const xU = xPos(upper);
  const xC = xPos(center);
  const zeroInside = min <= 0 && 0 <= max;
  const xZero = xPos(0);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ maxWidth: "100%" }}>
        <line
          x1={pad}
          y1={70}
          x2={width - pad}
          y2={70}
          stroke="#444"
          strokeWidth="2"
        />

        {zeroInside && (
          <>
            <line x1={xZero} y1={52} x2={xZero} y2={88} stroke="#888" strokeDasharray="4 4" />
            <text x={xZero} y={102} textAnchor="middle" fontSize="12" fill="#666">
              0
            </text>
          </>
        )}

        <line x1={xL} y1={70} x2={xU} y2={70} stroke="#c78b00" strokeWidth="8" />
        <circle cx={xL} cy={70} r={6} fill="#000" />
        <circle cx={xU} cy={70} r={6} fill="#000" />
        <circle cx={xC} cy={70} r={7} fill="#c1121f" />

        <line x1={xL} y1={48} x2={xL} y2={92} stroke="#000" />
        <line x1={xU} y1={48} x2={xU} y2={92} stroke="#000" />
        <line x1={xC} y1={45} x2={xC} y2={95} stroke="#c1121f" />

        <text x={xL} y={35} textAnchor="middle" fontSize="12">
          Lower = {fmt(lower, 4)}
        </text>
        <text x={xC} y={20} textAnchor="middle" fontSize="12" fill="#c1121f">
          {label} = {fmt(center, 4)}
        </text>
        <text x={xU} y={35} textAnchor="middle" fontSize="12">
          Upper = {fmt(upper, 4)}
        </text>

        <text x={width / 2} y={120} textAnchor="middle" fontSize="13" fontWeight="600">
          Confidence Interval Graph
        </text>
      </svg>
    </div>
  );
}

export default function ConfidenceIntervalCalculatorPage() {
  const [intervalType, setIntervalType] =
    useState<IntervalType>("one-mean-known-sigma");
  const [inputMode, setInputMode] = useState<InputMode>("summary");
  const [confidenceLevel, setConfidenceLevel] = useState("95");
  const [submitted, setSubmitted] = useState(false);

  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Summary input states
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

  const [dBar, setDBar] = useState("");
  const [sd, setSd] = useState("");
  const [nd, setNd] = useState("");

  const [x1, setX1] = useState("");
  const [x2, setX2] = useState("");

  const [varianceS2, setVarianceS2] = useState("");
  const [varianceN, setVarianceN] = useState("");

  const [ratioS1Sq, setRatioS1Sq] = useState("");
  const [ratioS2Sq, setRatioS2Sq] = useState("");
  const [ratioN1, setRatioN1] = useState("");
  const [ratioN2, setRatioN2] = useState("");

  // Raw manual entry
  const [rawSampleA, setRawSampleA] = useState("");
  const [rawSampleB, setRawSampleB] = useState("");
  const [rawBinaryA, setRawBinaryA] = useState("");
  const [rawBinaryB, setRawBinaryB] = useState("");
  const [rawDiffs, setRawDiffs] = useState("");

  // Excel data
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

  const result = useMemo((): ResultBlock | null => {
    const cl = toNum(confidenceLevel);
    if (!Number.isFinite(cl) || cl <= 0 || cl >= 100) return null;

    const alpha = alphaFromCL(cl);
    const alphaHalf = alpha / 2;

    try {
      // ---------- Build inputs from selected mode ----------
      if (intervalType === "one-mean-known-sigma") {
        let meanValue = NaN;
        let sigmaValue = toNum(sigma);
        let nValue = NaN;

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
          !Number.isFinite(meanValue) ||
          !Number.isFinite(sigmaValue) ||
          !Number.isFinite(nValue) ||
          sigmaValue <= 0 ||
          nValue <= 0
        ) {
          return null;
        }

        const z = zCritical(cl);
        const se = sigmaValue / Math.sqrt(nValue);
        const me = z * se;
        const lower = meanValue - me;
        const upper = meanValue + me;

        return {
          title: "Confidence Interval for One Population Mean (Population Standard Deviation Known)",
          question: `A sample has mean x̄ = ${fmt(meanValue, 4)}, population standard deviation σ = ${fmt(
            sigmaValue,
            4
          )}, and sample size n = ${fmt(nValue, 0)}. Construct a ${cl}% confidence interval for the population mean μ.`,
          formulaText: "CI for μ = x̄ ± z × (σ / √n)",
          criticalValueText: `z* = ${fmt(z, 4)}`,
          criticalExplanation: [
            `${cl}% confidence means the central area is ${fmt(cl / 100, 4)}.`,
            `So α = 1 - ${fmt(cl / 100, 4)} = ${fmt(alpha, 4)}.`,
            `For a two-sided confidence interval, α/2 = ${fmt(alphaHalf, 4)} goes to each tail.`,
            `Therefore the cumulative probability to the left of the positive critical value is 1 - α/2 = ${fmt(
              1 - alphaHalf,
              4
            )}.`,
            `From the standard normal distribution table, that gives z* = ${fmt(z, 4)}.`,
          ],
          resultSummary: [
            `Sample mean x̄ = ${fmt(meanValue, 6)}`,
            `Sample size n = ${fmt(nValue, 0)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Margin of error = ${fmt(me, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Use the formula CI = x̄ ± z × (σ / √n).`,
            `Substitute x̄ = ${fmt(meanValue, 6)}, z = ${fmt(z, 4)}, σ = ${fmt(
              sigmaValue,
              6
            )}, and n = ${fmt(nValue, 0)}.`,
            `Compute standard error: SE = ${fmt(sigmaValue, 6)} / √${fmt(
              nValue,
              0
            )} = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(z, 4)} × ${fmt(se, 6)} = ${fmt(
              me,
              6
            )}.`,
            `Lower limit = ${fmt(meanValue, 6)} - ${fmt(me, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(meanValue, 6)} + ${fmt(me, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true population mean μ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: meanValue, label: "x̄" },
        };
      }

      if (intervalType === "one-mean-unknown-sigma") {
        let meanValue = NaN;
        let sValue = NaN;
        let nValue = NaN;

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
          !Number.isFinite(meanValue) ||
          !Number.isFinite(sValue) ||
          !Number.isFinite(nValue) ||
          sValue <= 0 ||
          nValue <= 1
        ) {
          return null;
        }

        const df = nValue - 1;
        const t = tCritical(cl, df);
        const se = sValue / Math.sqrt(nValue);
        const me = t * se;
        const lower = meanValue - me;
        const upper = meanValue + me;

        return {
          title: "Confidence Interval for One Population Mean (Population Standard Deviation Unknown)",
          question: `A sample has mean x̄ = ${fmt(meanValue, 4)}, sample standard deviation s = ${fmt(
            sValue,
            4
          )}, and sample size n = ${fmt(nValue, 0)}. Construct a ${cl}% confidence interval for the population mean μ.`,
          formulaText: "CI for μ = x̄ ± t × (s / √n)",
          criticalValueText: `t* = ${fmt(t, 4)} with df = ${fmt(df, 0)}`,
          criticalExplanation: [
            `${cl}% confidence gives α = ${fmt(alpha, 4)} and α/2 = ${fmt(alphaHalf, 4)}.`,
            `Because the population standard deviation is unknown, we use the t-distribution.`,
            `Degrees of freedom are df = n - 1 = ${fmt(nValue, 0)} - 1 = ${fmt(df, 0)}.`,
            `The needed critical value uses cumulative probability 1 - α/2 = ${fmt(1 - alphaHalf, 4)}.`,
            `From the t-distribution, t* = ${fmt(t, 4)}.`,
          ],
          resultSummary: [
            `Sample mean x̄ = ${fmt(meanValue, 6)}`,
            `Sample standard deviation s = ${fmt(sValue, 6)}`,
            `Degrees of freedom = ${fmt(df, 0)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Use the formula CI = x̄ ± t × (s / √n).`,
            `Compute standard error: SE = ${fmt(sValue, 6)} / √${fmt(
              nValue,
              0
            )} = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(t, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Lower limit = ${fmt(meanValue, 6)} - ${fmt(me, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(meanValue, 6)} + ${fmt(me, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true population mean μ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: meanValue, label: "x̄" },
        };
      }

      if (intervalType === "one-proportion") {
        let successes = NaN;
        let nValue = NaN;

        if (inputMode === "summary") {
          successes = toNum(x);
          nValue = toNum(n);
        } else if (inputMode === "raw") {
          const arr = parseBinaryList(rawBinaryA);
          if (arr.length >= 1) {
            successes = proportionSuccesses(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getBinaryColumn(excelRows, excelColA);
          if (arr.length >= 1) {
            successes = proportionSuccesses(arr);
            nValue = arr.length;
          }
        }

        if (
          !Number.isFinite(successes) ||
          !Number.isFinite(nValue) ||
          nValue <= 0 ||
          successes < 0 ||
          successes > nValue
        ) {
          return null;
        }

        const pHat = successes / nValue;
        const z = zCritical(cl);
        const se = Math.sqrt((pHat * (1 - pHat)) / nValue);
        const me = z * se;
        const lower = Math.max(0, pHat - me);
        const upper = Math.min(1, pHat + me);

        return {
          title: "Confidence Interval for One Population Proportion",
          question: `In a sample of size n = ${fmt(nValue, 0)}, there are x = ${fmt(
            successes,
            0
          )} successes. Construct a ${cl}% confidence interval for the population proportion p.`,
          formulaText: "CI for p = p̂ ± z × √[ p̂(1 - p̂) / n ]",
          criticalValueText: `z* = ${fmt(z, 4)}`,
          criticalExplanation: [
            `${cl}% confidence gives α = ${fmt(alpha, 4)}.`,
            `For a two-sided interval, α/2 = ${fmt(alphaHalf, 4)}.`,
            `So the cumulative probability to the left of the positive critical value is ${fmt(
              1 - alphaHalf,
              4
            )}.`,
            `From the standard normal distribution, z* = ${fmt(z, 4)}.`,
          ],
          resultSummary: [
            `Sample proportion p̂ = ${fmt(pHat, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Margin of error = ${fmt(me, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute p̂ = x / n = ${fmt(successes, 0)} / ${fmt(nValue, 0)} = ${fmt(pHat, 6)}.`,
            `Compute standard error: SE = √[ ${fmt(pHat, 6)}(1 - ${fmt(
              pHat,
              6
            )}) / ${fmt(nValue, 0)} ] = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(z, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Lower limit = ${fmt(pHat, 6)} - ${fmt(me, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(pHat, 6)} + ${fmt(me, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true population proportion p lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: pHat, label: "p̂" },
        };
      }

      if (intervalType === "two-means-known-sigmas") {
        let m1 = NaN;
        let m2 = NaN;
        let sig1 = toNum(sigma1);
        let sig2 = toNum(sigma2);
        let N1 = NaN;
        let N2 = NaN;

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
          ![m1, m2, sig1, sig2, N1, N2].every(Number.isFinite) ||
          sig1 <= 0 ||
          sig2 <= 0 ||
          N1 <= 0 ||
          N2 <= 0
        ) {
          return null;
        }

        const diff = m1 - m2;
        const z = zCritical(cl);
        const se = Math.sqrt(sig1 ** 2 / N1 + sig2 ** 2 / N2);
        const me = z * se;
        const lower = diff - me;
        const upper = diff + me;

        return {
          title: "Confidence Interval for Difference of Two Means (Population Standard Deviations Known)",
          question: `Sample 1 has x̄₁ = ${fmt(m1, 4)}, σ₁ = ${fmt(sig1, 4)}, n₁ = ${fmt(
            N1,
            0
          )}. Sample 2 has x̄₂ = ${fmt(m2, 4)}, σ₂ = ${fmt(sig2, 4)}, n₂ = ${fmt(
            N2,
            0
          )}. Construct a ${cl}% confidence interval for μ₁ - μ₂.`,
          formulaText: "CI for μ₁ - μ₂ = (x̄₁ - x̄₂) ± z × √(σ₁²/n₁ + σ₂²/n₂)",
          criticalValueText: `z* = ${fmt(z, 4)}`,
          criticalExplanation: [
            `Because both population standard deviations are known, we use the z-distribution.`,
            `${cl}% confidence gives α = ${fmt(alpha, 4)} and α/2 = ${fmt(alphaHalf, 4)}.`,
            `So the cumulative probability is 1 - α/2 = ${fmt(1 - alphaHalf, 4)}.`,
            `Hence z* = ${fmt(z, 4)}.`,
          ],
          resultSummary: [
            `Difference in sample means = ${fmt(diff, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Margin of error = ${fmt(me, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute x̄₁ - x̄₂ = ${fmt(m1, 6)} - ${fmt(m2, 6)} = ${fmt(diff, 6)}.`,
            `Compute standard error: SE = √(${fmt(sig1 ** 2, 6)}/${fmt(
              N1,
              0
            )} + ${fmt(sig2 ** 2, 6)}/${fmt(N2, 0)}) = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(z, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Lower limit = ${fmt(diff, 6)} - ${fmt(me, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(diff, 6)} + ${fmt(me, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true difference μ₁ - μ₂ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: diff, label: "x̄₁ - x̄₂" },
        };
      }

      if (intervalType === "two-means-unknown-equal") {
        let m1 = NaN;
        let m2 = NaN;
        let sd1 = NaN;
        let sd2 = NaN;
        let N1 = NaN;
        let N2 = NaN;

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
          ![m1, m2, sd1, sd2, N1, N2].every(Number.isFinite) ||
          sd1 <= 0 ||
          sd2 <= 0 ||
          N1 <= 1 ||
          N2 <= 1
        ) {
          return null;
        }

        const diff = m1 - m2;
        const df = N1 + N2 - 2;
        const sp2 = (((N1 - 1) * sd1 ** 2) + ((N2 - 1) * sd2 ** 2)) / df;
        const sp = Math.sqrt(sp2);
        const se = sp * Math.sqrt(1 / N1 + 1 / N2);
        const t = tCritical(cl, df);
        const me = t * se;
        const lower = diff - me;
        const upper = diff + me;

        return {
          title: "Confidence Interval for Difference of Two Means (Unknown SDs, Equal Variances)",
          question: `Sample 1 has x̄₁ = ${fmt(m1, 4)}, s₁ = ${fmt(sd1, 4)}, n₁ = ${fmt(
            N1,
            0
          )}. Sample 2 has x̄₂ = ${fmt(m2, 4)}, s₂ = ${fmt(sd2, 4)}, n₂ = ${fmt(
            N2,
            0
          )}. Assuming equal population variances, construct a ${cl}% confidence interval for μ₁ - μ₂.`,
          formulaText:
            "CI for μ₁ - μ₂ = (x̄₁ - x̄₂) ± t × [ sₚ × √(1/n₁ + 1/n₂) ]",
          criticalValueText: `t* = ${fmt(t, 4)} with df = ${fmt(df, 0)}`,
          criticalExplanation: [
            `Population standard deviations are unknown, so we use the t-distribution.`,
            `Because equal variances are assumed, we use the pooled variance.`,
            `Degrees of freedom are df = n₁ + n₂ - 2 = ${fmt(df, 0)}.`,
            `The critical value t* is obtained using cumulative probability 1 - α/2 = ${fmt(
              1 - alphaHalf,
              4
            )}.`,
          ],
          resultSummary: [
            `Pooled variance sₚ² = ${fmt(sp2, 6)}`,
            `Pooled standard deviation sₚ = ${fmt(sp, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute pooled variance: sₚ² = [(${fmt(N1 - 1, 0)})(${fmt(
              sd1 ** 2,
              6
            )}) + (${fmt(N2 - 1, 0)})(${fmt(sd2 ** 2, 6)})] / ${fmt(df, 0)} = ${fmt(
              sp2,
              6
            )}.`,
            `Compute pooled standard deviation: sₚ = √${fmt(sp2, 6)} = ${fmt(sp, 6)}.`,
            `Compute standard error: SE = ${fmt(sp, 6)} × √(1/${fmt(N1, 0)} + 1/${fmt(
              N2,
              0
            )}) = ${fmt(se, 6)}.`,
            `Compute difference: x̄₁ - x̄₂ = ${fmt(m1, 6)} - ${fmt(m2, 6)} = ${fmt(diff, 6)}.`,
            `Compute margin of error: ME = ${fmt(t, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)}).`,
          ],
          interpretation: `We are ${cl}% confident that the true difference μ₁ - μ₂ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: diff, label: "x̄₁ - x̄₂" },
        };
      }

      if (intervalType === "two-means-unknown-unequal") {
        let m1 = NaN;
        let m2 = NaN;
        let sd1 = NaN;
        let sd2 = NaN;
        let N1 = NaN;
        let N2 = NaN;

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
          ![m1, m2, sd1, sd2, N1, N2].every(Number.isFinite) ||
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
        const t = tCritical(cl, df);
        const me = t * se;
        const lower = diff - me;
        const upper = diff + me;

        return {
          title: "Confidence Interval for Difference of Two Means (Unknown SDs, Unequal Variances / Welch)",
          question: `Sample 1 has x̄₁ = ${fmt(m1, 4)}, s₁ = ${fmt(sd1, 4)}, n₁ = ${fmt(
            N1,
            0
          )}. Sample 2 has x̄₂ = ${fmt(m2, 4)}, s₂ = ${fmt(sd2, 4)}, n₂ = ${fmt(
            N2,
            0
          )}. Without assuming equal variances, construct a ${cl}% confidence interval for μ₁ - μ₂.`,
          formulaText: "CI for μ₁ - μ₂ = (x̄₁ - x̄₂) ± t × √(s₁²/n₁ + s₂²/n₂)",
          criticalValueText: `t* = ${fmt(t, 4)} with Welch df ≈ ${fmt(df, 4)}`,
          criticalExplanation: [
            `Population standard deviations are unknown and equal variances are not assumed.`,
            `So we use Welch's t interval.`,
            `The standard error is based on s₁²/n₁ + s₂²/n₂.`,
            `The degrees of freedom are approximated by the Welch-Satterthwaite formula.`,
            `Then the critical value is obtained from the t-distribution.`,
          ],
          resultSummary: [
            `Difference in sample means = ${fmt(diff, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Welch df ≈ ${fmt(df, 4)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute v₁ = s₁²/n₁ = ${fmt(sd1 ** 2, 6)}/${fmt(N1, 0)} = ${fmt(v1, 6)}.`,
            `Compute v₂ = s₂²/n₂ = ${fmt(sd2 ** 2, 6)}/${fmt(N2, 0)} = ${fmt(v2, 6)}.`,
            `Compute standard error: SE = √(${fmt(v1, 6)} + ${fmt(v2, 6)}) = ${fmt(se, 6)}.`,
            `Compute the difference x̄₁ - x̄₂ = ${fmt(m1, 6)} - ${fmt(m2, 6)} = ${fmt(diff, 6)}.`,
            `Compute Welch df ≈ ${fmt(df, 4)}.`,
            `Compute margin of error: ME = ${fmt(t, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)}).`,
          ],
          interpretation: `We are ${cl}% confident that the true difference μ₁ - μ₂ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: diff, label: "x̄₁ - x̄₂" },
        };
      }

      if (intervalType === "paired-mean") {
        let dmean = NaN;
        let dsd = NaN;
        let dn = NaN;

        if (inputMode === "summary") {
          dmean = toNum(dBar);
          dsd = toNum(sd);
          dn = toNum(nd);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawDiffs);
          if (arr.length >= 2) {
            dmean = mean(arr);
            dsd = sampleStd(arr);
            dn = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 2) {
            dmean = mean(arr);
            dsd = sampleStd(arr);
            dn = arr.length;
          }
        }

        if (
          ![dmean, dsd, dn].every(Number.isFinite) ||
          dsd <= 0 ||
          dn <= 1
        ) {
          return null;
        }

        const df = dn - 1;
        const t = tCritical(cl, df);
        const se = dsd / Math.sqrt(dn);
        const me = t * se;
        const lower = dmean - me;
        const upper = dmean + me;

        return {
          title: "Confidence Interval for Paired Mean Difference",
          question: `For paired data, the sample mean difference is d̄ = ${fmt(
            dmean,
            4
          )}, the sample standard deviation of the differences is s_d = ${fmt(
            dsd,
            4
          )}, and the number of pairs is n = ${fmt(dn, 0)}. Construct a ${cl}% confidence interval for the population mean difference μ_d.`,
          formulaText: "CI for μ_d = d̄ ± t × (s_d / √n)",
          criticalValueText: `t* = ${fmt(t, 4)} with df = ${fmt(df, 0)}`,
          criticalExplanation: [
            `Paired data are reduced to a single sample of differences.`,
            `Because the population standard deviation of the differences is unknown, we use the t-distribution.`,
            `Degrees of freedom are df = n - 1 = ${fmt(df, 0)}.`,
            `Then t* is chosen using cumulative probability ${fmt(1 - alphaHalf, 4)}.`,
          ],
          resultSummary: [
            `Mean difference d̄ = ${fmt(dmean, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Margin of error = ${fmt(me, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Use the formula CI = d̄ ± t × (s_d / √n).`,
            `Compute standard error: SE = ${fmt(dsd, 6)} / √${fmt(dn, 0)} = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(t, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Lower limit = ${fmt(dmean, 6)} - ${fmt(me, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(dmean, 6)} + ${fmt(me, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true paired mean difference μ_d lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: dmean, label: "d̄" },
        };
      }

      if (intervalType === "two-proportions") {
        let sx1 = NaN;
        let sx2 = NaN;
        let N1 = NaN;
        let N2 = NaN;

        if (inputMode === "summary") {
          sx1 = toNum(x1);
          sx2 = toNum(x2);
          N1 = toNum(n1);
          N2 = toNum(n2);
        } else if (inputMode === "raw") {
          const a = parseBinaryList(rawBinaryA);
          const b = parseBinaryList(rawBinaryB);
          if (a.length >= 1 && b.length >= 1) {
            sx1 = proportionSuccesses(a);
            sx2 = proportionSuccesses(b);
            N1 = a.length;
            N2 = b.length;
          }
        } else {
          const a = getBinaryColumn(excelRows, excelColA);
          const b = getBinaryColumn(excelRows, excelColB);
          if (a.length >= 1 && b.length >= 1) {
            sx1 = proportionSuccesses(a);
            sx2 = proportionSuccesses(b);
            N1 = a.length;
            N2 = b.length;
          }
        }

        if (
          ![sx1, sx2, N1, N2].every(Number.isFinite) ||
          N1 <= 0 ||
          N2 <= 0 ||
          sx1 < 0 ||
          sx1 > N1 ||
          sx2 < 0 ||
          sx2 > N2
        ) {
          return null;
        }

        const p1 = sx1 / N1;
        const p2 = sx2 / N2;
        const diff = p1 - p2;
        const z = zCritical(cl);
        const se = Math.sqrt((p1 * (1 - p1)) / N1 + (p2 * (1 - p2)) / N2);
        const me = z * se;
        const lower = diff - me;
        const upper = diff + me;

        return {
          title: "Confidence Interval for Difference of Two Proportions",
          question: `Sample 1 has x₁ = ${fmt(sx1, 0)} successes out of n₁ = ${fmt(
            N1,
            0
          )}. Sample 2 has x₂ = ${fmt(sx2, 0)} successes out of n₂ = ${fmt(
            N2,
            0
          )}. Construct a ${cl}% confidence interval for p₁ - p₂.`,
          formulaText:
            "CI for p₁ - p₂ = (p̂₁ - p̂₂) ± z × √[ p̂₁(1-p̂₁)/n₁ + p̂₂(1-p̂₂)/n₂ ]",
          criticalValueText: `z* = ${fmt(z, 4)}`,
          criticalExplanation: [
            `For a difference of two proportions, we use the standard normal critical value.`,
            `${cl}% confidence gives α = ${fmt(alpha, 4)} and α/2 = ${fmt(alphaHalf, 4)}.`,
            `So the required cumulative probability is 1 - α/2 = ${fmt(1 - alphaHalf, 4)}.`,
            `Therefore z* = ${fmt(z, 4)}.`,
          ],
          resultSummary: [
            `p̂₁ = ${fmt(p1, 6)}`,
            `p̂₂ = ${fmt(p2, 6)}`,
            `Difference p̂₁ - p̂₂ = ${fmt(diff, 6)}`,
            `Standard error = ${fmt(se, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute p̂₁ = ${fmt(sx1, 0)} / ${fmt(N1, 0)} = ${fmt(p1, 6)}.`,
            `Compute p̂₂ = ${fmt(sx2, 0)} / ${fmt(N2, 0)} = ${fmt(p2, 6)}.`,
            `Compute difference: p̂₁ - p̂₂ = ${fmt(p1, 6)} - ${fmt(p2, 6)} = ${fmt(diff, 6)}.`,
            `Compute standard error: SE = ${fmt(se, 6)}.`,
            `Compute margin of error: ME = ${fmt(z, 4)} × ${fmt(se, 6)} = ${fmt(me, 6)}.`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)}).`,
          ],
          interpretation: `We are ${cl}% confident that the true difference p₁ - p₂ lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: diff, label: "p̂₁ - p̂₂" },
        };
      }

      if (intervalType === "one-variance") {
        let varValue = NaN;
        let nValue = NaN;

        if (inputMode === "summary") {
          varValue = toNum(varianceS2);
          nValue = toNum(varianceN);
        } else if (inputMode === "raw") {
          const arr = parseNumericList(rawSampleA);
          if (arr.length >= 2) {
            varValue = sampleVariance(arr);
            nValue = arr.length;
          }
        } else {
          const arr = getNumericColumn(excelRows, excelColA);
          if (arr.length >= 2) {
            varValue = sampleVariance(arr);
            nValue = arr.length;
          }
        }

        if (
          !Number.isFinite(varValue) ||
          !Number.isFinite(nValue) ||
          varValue <= 0 ||
          nValue <= 1
        ) {
          return null;
        }

        const df = nValue - 1;
        const chiL = chiSqLeft(cl, df);
        const chiR = chiSqRight(cl, df);
        const lower = (df * varValue) / chiR;
        const upper = (df * varValue) / chiL;

        return {
          title: "Confidence Interval for Population Variance",
          question: `A sample has variance s² = ${fmt(varValue, 4)} and sample size n = ${fmt(
            nValue,
            0
          )}. Construct a ${cl}% confidence interval for the population variance σ².`,
          formulaText: "CI for σ² = [ (n-1)s² / χ²(right), (n-1)s² / χ²(left) ]",
          criticalValueText: `χ²(left) = ${fmt(chiL, 4)}, χ²(right) = ${fmt(
            chiR,
            4
          )} with df = ${fmt(df, 0)}`,
          criticalExplanation: [
            `A confidence interval for variance uses the chi-square distribution.`,
            `Degrees of freedom are df = n - 1 = ${fmt(df, 0)}.`,
            `${cl}% confidence gives α = ${fmt(alpha, 4)} and α/2 = ${fmt(alphaHalf, 4)}.`,
            `So we need two cutoffs: χ²(left) at α/2 and χ²(right) at 1 - α/2.`,
          ],
          resultSummary: [
            `Sample variance s² = ${fmt(varValue, 6)}`,
            `Degrees of freedom = ${fmt(df, 0)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute df = n - 1 = ${fmt(nValue, 0)} - 1 = ${fmt(df, 0)}.`,
            `Find χ²(left) = ${fmt(chiL, 6)} and χ²(right) = ${fmt(chiR, 6)}.`,
            `Lower limit = [(${fmt(df, 0)})(${fmt(varValue, 6)})] / ${fmt(chiR, 6)} = ${fmt(
              lower,
              6
            )}.`,
            `Upper limit = [(${fmt(df, 0)})(${fmt(varValue, 6)})] / ${fmt(chiL, 6)} = ${fmt(
              upper,
              6
            )}.`,
          ],
          interpretation: `We are ${cl}% confident that the true population variance σ² lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: varValue, label: "s²" },
        };
      }

      if (intervalType === "ratio-variances") {
        let v1 = NaN;
        let v2 = NaN;
        let N1 = NaN;
        let N2 = NaN;

        if (inputMode === "summary") {
          v1 = toNum(ratioS1Sq);
          v2 = toNum(ratioS2Sq);
          N1 = toNum(ratioN1);
          N2 = toNum(ratioN2);
        } else if (inputMode === "raw") {
          const a = parseNumericList(rawSampleA);
          const b = parseNumericList(rawSampleB);
          if (a.length >= 2 && b.length >= 2) {
            v1 = sampleVariance(a);
            v2 = sampleVariance(b);
            N1 = a.length;
            N2 = b.length;
          }
        } else {
          const a = getNumericColumn(excelRows, excelColA);
          const b = getNumericColumn(excelRows, excelColB);
          if (a.length >= 2 && b.length >= 2) {
            v1 = sampleVariance(a);
            v2 = sampleVariance(b);
            N1 = a.length;
            N2 = b.length;
          }
        }

        if (
          ![v1, v2, N1, N2].every(Number.isFinite) ||
          v1 <= 0 ||
          v2 <= 0 ||
          N1 <= 1 ||
          N2 <= 1
        ) {
          return null;
        }

        const df1 = N1 - 1;
        const df2 = N2 - 1;
        const ratio = v1 / v2;
        const FL = fLeft(cl, df1, df2);
        const FR = fRight(cl, df1, df2);
        const lower = ratio / FR;
        const upper = ratio / FL;

        return {
          title: "Confidence Interval for Ratio of Two Population Variances",
          question: `Sample 1 has variance s₁² = ${fmt(v1, 4)} and size n₁ = ${fmt(
            N1,
            0
          )}. Sample 2 has variance s₂² = ${fmt(v2, 4)} and size n₂ = ${fmt(
            N2,
            0
          )}. Construct a ${cl}% confidence interval for σ₁² / σ₂².`,
          formulaText: "CI for σ₁²/σ₂² = [ (s₁²/s₂²)/F(right), (s₁²/s₂²)/F(left) ]",
          criticalValueText: `F(left) = ${fmt(FL, 4)}, F(right) = ${fmt(
            FR,
            4
          )} with df₁ = ${fmt(df1, 0)}, df₂ = ${fmt(df2, 0)}`,
          criticalExplanation: [
            `A confidence interval for the ratio of two variances uses the F distribution.`,
            `Degrees of freedom are df₁ = n₁ - 1 = ${fmt(df1, 0)} and df₂ = n₂ - 1 = ${fmt(
              df2,
              0
            )}.`,
            `${cl}% confidence gives α = ${fmt(alpha, 4)} and α/2 = ${fmt(alphaHalf, 4)}.`,
            `So we need two F cutoffs: one at α/2 and one at 1 - α/2.`,
          ],
          resultSummary: [
            `Sample variance ratio s₁² / s₂² = ${fmt(ratio, 6)}`,
            `Confidence interval = (${fmt(lower, 6)}, ${fmt(upper, 6)})`,
          ],
          steps: [
            `Compute s₁² / s₂² = ${fmt(v1, 6)} / ${fmt(v2, 6)} = ${fmt(ratio, 6)}.`,
            `Find F(left) = ${fmt(FL, 6)} and F(right) = ${fmt(FR, 6)}.`,
            `Lower limit = ${fmt(ratio, 6)} / ${fmt(FR, 6)} = ${fmt(lower, 6)}.`,
            `Upper limit = ${fmt(ratio, 6)} / ${fmt(FL, 6)} = ${fmt(upper, 6)}.`,
          ],
          interpretation: `We are ${cl}% confident that the true ratio σ₁² / σ₂² lies between ${fmt(
            lower,
            4
          )} and ${fmt(upper, 4)}.`,
          interval: { lower, upper, center: ratio, label: "s₁²/s₂²" },
        };
      }

      return null;
    } catch {
      return null;
    }
  }, [
    intervalType,
    inputMode,
    confidenceLevel,
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
    dBar,
    sd,
    nd,
    x1,
    x2,
    varianceS2,
    varianceN,
    ratioS1Sq,
    ratioS2Sq,
    ratioN1,
    ratioN2,
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

    pdf.save("confidence-interval-solution.pdf");
  }

  function renderSummaryInputs() {
    switch (intervalType) {
      case "one-mean-known-sigma":
        return (
          <InputGrid>
            <Input label="Sample mean, x̄" value={xBar} onChange={setXBar} />
            <Input label="Population standard deviation, σ" value={sigma} onChange={setSigma} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "one-mean-unknown-sigma":
        return (
          <InputGrid>
            <Input label="Sample mean, x̄" value={xBar} onChange={setXBar} />
            <Input label="Sample standard deviation, s" value={s} onChange={setS} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "one-proportion":
        return (
          <InputGrid>
            <Input label="Number of successes, x" value={x} onChange={setX} />
            <Input label="Sample size, n" value={n} onChange={setN} />
          </InputGrid>
        );

      case "two-means-known-sigmas":
        return (
          <InputGrid>
            <Input label="Sample 1 mean, x̄₁" value={xBar1} onChange={setXBar1} />
            <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Sample 2 mean, x̄₂" value={xBar2} onChange={setXBar2} />
            <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "two-means-unknown-equal":
      case "two-means-unknown-unequal":
        return (
          <InputGrid>
            <Input label="Sample 1 mean, x̄₁" value={xBar1} onChange={setXBar1} />
            <Input label="Sample SD 1, s₁" value={s1} onChange={setS1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Sample 2 mean, x̄₂" value={xBar2} onChange={setXBar2} />
            <Input label="Sample SD 2, s₂" value={s2} onChange={setS2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "paired-mean":
        return (
          <InputGrid>
            <Input label="Mean of paired differences, d̄" value={dBar} onChange={setDBar} />
            <Input label="SD of paired differences, s_d" value={sd} onChange={setSd} />
            <Input label="Number of pairs, n" value={nd} onChange={setNd} />
          </InputGrid>
        );

      case "two-proportions":
        return (
          <InputGrid>
            <Input label="Successes in sample 1, x₁" value={x1} onChange={setX1} />
            <Input label="Sample size 1, n₁" value={n1} onChange={setN1} />
            <Input label="Successes in sample 2, x₂" value={x2} onChange={setX2} />
            <Input label="Sample size 2, n₂" value={n2} onChange={setN2} />
          </InputGrid>
        );

      case "one-variance":
        return (
          <InputGrid>
            <Input label="Sample variance, s²" value={varianceS2} onChange={setVarianceS2} />
            <Input label="Sample size, n" value={varianceN} onChange={setVarianceN} />
          </InputGrid>
        );

      case "ratio-variances":
        return (
          <InputGrid>
            <Input label="Sample variance 1, s₁²" value={ratioS1Sq} onChange={setRatioS1Sq} />
            <Input label="Sample size 1, n₁" value={ratioN1} onChange={setRatioN1} />
            <Input label="Sample variance 2, s₂²" value={ratioS2Sq} onChange={setRatioS2Sq} />
            <Input label="Sample size 2, n₂" value={ratioN2} onChange={setRatioN2} />
          </InputGrid>
        );

      default:
        return null;
    }
  }

  function renderRawInputs() {
    switch (intervalType) {
      case "one-mean-known-sigma":
        return (
          <>
            <InputGrid>
              <TextAreaInput
                label="Raw numeric sample data"
                value={rawSampleA}
                onChange={setRawSampleA}
                placeholder="Example: 12, 15, 18, 20, 19"
              />
              <Input
                label="Population standard deviation, σ"
                value={sigma}
                onChange={setSigma}
              />
            </InputGrid>
            <InfoText>
              Enter numeric values separated by commas, spaces, or new lines.
            </InfoText>
          </>
        );

      case "one-mean-unknown-sigma":
      case "one-variance":
        return (
          <>
            <TextAreaInput
              label="Raw numeric sample data"
              value={rawSampleA}
              onChange={setRawSampleA}
              placeholder="Example: 12, 15, 18, 20, 19"
            />
            <InfoText>
              The calculator will compute the sample mean, sample standard deviation, sample variance, and sample size automatically.
            </InfoText>
          </>
        );

      case "one-proportion":
        return (
          <>
            <TextAreaInput
              label="Raw binary data"
              value={rawBinaryA}
              onChange={setRawBinaryA}
              placeholder="Example: 1, 0, 1, 1, 0, 1 or yes, no, yes, yes"
            />
            <InfoText>
              Use 1/0, yes/no, true/false, or success/failure.
            </InfoText>
          </>
        );

      case "two-means-known-sigmas":
        return (
          <>
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
              <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
              <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
            </InputGrid>
          </>
        );

      case "two-means-unknown-equal":
      case "two-means-unknown-unequal":
      case "ratio-variances":
        return (
          <>
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

      case "paired-mean":
        return (
          <>
            <TextAreaInput
              label="Raw paired differences"
              value={rawDiffs}
              onChange={setRawDiffs}
              placeholder="Example: 2, -1, 3, 4, 0, 1"
            />
            <InfoText>
              Enter the differences directly, such as after − before.
            </InfoText>
          </>
        );

      case "two-proportions":
        return (
          <>
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
            <InfoText>
              Use 1/0, yes/no, true/false, or success/failure.
            </InfoText>
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
            <InfoText>
              Use the column selectors below to choose the data columns from the first worksheet.
            </InfoText>

            {(intervalType === "one-mean-known-sigma" ||
              intervalType === "one-mean-unknown-sigma" ||
              intervalType === "one-proportion" ||
              intervalType === "paired-mean" ||
              intervalType === "one-variance") && (
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
                {intervalType === "one-mean-known-sigma" && (
                  <Input label="Population standard deviation, σ" value={sigma} onChange={setSigma} />
                )}
              </InputGrid>
            )}

            {(intervalType === "two-means-known-sigmas" ||
              intervalType === "two-means-unknown-equal" ||
              intervalType === "two-means-unknown-unequal" ||
              intervalType === "two-proportions" ||
              intervalType === "ratio-variances") && (
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
                {intervalType === "two-means-known-sigmas" && (
                  <>
                    <Input label="Population SD 1, σ₁" value={sigma1} onChange={setSigma1} />
                    <Input label="Population SD 2, σ₂" value={sigma2} onChange={setSigma2} />
                  </>
                )}
              </InputGrid>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 1100, padding: "40px 20px", background: "rgba(240, 217, 14, 0.81)", borderRadius: 16 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 10 }}>
        Confidence Interval Calculator
      </h1>

      <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 24 }}>
        Compute confidence intervals for means, proportions, variances, and differences.
        This version supports summary input, manual raw data entry, Excel upload,
        copy solution, PDF export, and interval graphing.
      </p>

      <SectionCard title="Choose Confidence Interval Type">
        <InputGrid>
          <Select
            label="Interval type"
            value={intervalType}
            onChange={(v) => {
              setIntervalType(v as IntervalType);
              resetSubmitted();
            }}
            options={[
              ["one-mean-known-sigma", "One mean (population standard deviation known)"],
              ["one-mean-unknown-sigma", "One mean (population standard deviation unknown)"],
              ["one-proportion", "One proportion"],
              ["two-means-known-sigmas", "Two means (both population standard deviations known)"],
              ["two-means-unknown-equal", "Two means (unknown SDs, equal variances)"],
              ["two-means-unknown-unequal", "Two means (unknown SDs, unequal variances / Welch)"],
              ["paired-mean", "Paired mean difference"],
              ["two-proportions", "Difference of two proportions"],
              ["one-variance", "One population variance"],
              ["ratio-variances", "Ratio of two population variances"],
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

          <Select
            label="Confidence level"
            value={confidenceLevel}
            onChange={(v) => {
              setConfidenceLevel(v);
              resetSubmitted();
            }}
            options={[
              ["80", "80%"],
              ["85", "85%"],
              ["90", "90%"],
              ["95", "95%"],
              ["98", "98%"],
              ["99", "99%"],
            ]}
          />
        </InputGrid>
      </SectionCard>

      <SectionCard title="Enter Data">
        {inputMode === "summary" && renderSummaryInputs()}
        {inputMode === "raw" && renderRawInputs()}
        {inputMode === "excel" && renderExcelInputs()}

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setSubmitted(true)}
            style={primaryButtonStyle}
          >
            Compute Confidence Interval
          </button>
        </div>

        {submitted && !result && (
          <p style={{ color: "crimson", marginTop: 14 }}>
            Please enter valid values for the selected confidence interval type and input mode.
          </p>
        )}
      </SectionCard>

      {submitted && result && (
        <div ref={resultRef}>
          <SectionCard title="Generated Question">
            <p style={{ lineHeight: 1.8 }}>{result.question}</p>
          </SectionCard>

          <SectionCard title="Formula Used">
            <div style={mathBoxStyle}>{result.formulaText}</div>
            <div style={{ marginTop: 12 }}>
              <strong>Critical value:</strong> {result.criticalValueText}
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

          {result.interval && (
            <SectionCard title="Graph of the Interval">
              <IntervalGraph
                lower={result.interval.lower}
                upper={result.interval.upper}
                center={result.interval.center}
                label={result.interval.label}
              />
            </SectionCard>
          )}
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

function InfoText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 12, marginBottom: 0, color: "#d71515", lineHeight: 1.7 }}>
      {children}
    </p>
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