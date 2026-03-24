import type {
  RowData,
  RowValue,
  VariableType,
  ColumnProfile,
  TestResult,
  LinearRegressionResult,
  LogisticRegressionResult,
  PcaResult,
  ClusteringResult,
  SurvivalResult,
  DifferentialExpressionResult,
  PublicHealthResult,
  EnvironmentalTSResult,
  DescriptiveStats,
} from "./types";

export function isMissing(v: unknown) {
  return v === null || v === undefined || String(v).trim() === "";
}

export function isNumericValue(v: unknown) {
  if (isMissing(v)) return false;
  return !Number.isNaN(Number(v));
}

export function isDateLike(v: unknown) {
  if (isMissing(v)) return false;
  const d = new Date(String(v));
  return !Number.isNaN(d.getTime());
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

export function mean(arr: number[]) {
  if (!arr.length) return null;
  return sum(arr) / arr.length;
}

export function variance(arr: number[], sample = true) {
  if (arr.length < 2) return 0;
  const m = mean(arr) ?? 0;
  const ss = arr.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ss / (sample ? arr.length - 1 : arr.length);
}

export function stdDev(arr: number[], sample = true) {
  return Math.sqrt(variance(arr, sample));
}

export function median(arr: number[]) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function quantile(arr: number[], q: number) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (s[base + 1] !== undefined) return s[base] + rest * (s[base + 1] - s[base]);
  return s[base];
}

export function minMax(arr: number[]) {
  if (!arr.length) return { min: null, max: null };
  return { min: Math.min(...arr), max: Math.max(...arr) };
}

export function formatNumber(v: number | null | undefined, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(d);
}

export function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));
  return sign * y;
}

export function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

export function approxTPValueFromZLike(t: number) {
  return 2 * (1 - normalCdf(Math.abs(t)));
}

export function chiSquarePValueApprox(stat: number, df: number) {
  if (df <= 0) return null;
  const z =
    (Math.pow(stat / df, 1 / 3) - (1 - 2 / (9 * df))) /
    Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

export function normalInverseApprox(p: number) {
  if (p <= 0 || p >= 1) return 0;
  const a1 = -39.69683028665376;
  const a2 = 220.9460984245205;
  const a3 = -275.9285104469687;
  const a4 = 138.357751867269;
  const a5 = -30.66479806614716;
  const a6 = 2.506628277459239;
  const b1 = -54.47609879822406;
  const b2 = 161.5858368580409;
  const b3 = -155.6989798598866;
  const b4 = 66.80131188771972;
  const b5 = -13.28068155288572;
  const c1 = -0.007784894002430293;
  const c2 = -0.3223964580411365;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163982698783;
  const d1 = 0.007784695709041462;
  const d2 = 0.3224671290700398;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q = 0;
  let r = 0;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
  q = p - 0.5;
  r = q * q;
  return (
    (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
    (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  );
}

export function confidenceIntervalNormal(est: number, se: number, level = 0.95): [number, number] {
  const z = normalInverseApprox((1 + level) / 2);
  return [est - z * se, est + z * se];
}

export function rank(values: number[]) {
  const sorted = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
    i = j;
  }
  return ranks;
}

export function transpose(matrix: number[][]) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]));
}

export function multiplyMatrix(A: number[][], B: number[][]) {
  const result = Array.from({ length: A.length }, () =>
    Array(B[0].length).fill(0)
  );
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < B.length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

export function multiplyMatrixVector(A: number[][], x: number[]) {
  return A.map((row) => row.reduce((acc, v, i) => acc + v * x[i], 0));
}

export function identityMatrix(n: number) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

export function inverseMatrix(A: number[][]) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...identityMatrix(n)[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      let swap = i + 1;
      while (swap < n && Math.abs(M[swap][i]) < 1e-12) swap++;
      if (swap === n) return null;
      [M[i], M[swap]] = [M[swap], M[i]];
      pivot = M[i][i];
    }
    for (let j = 0; j < 2 * n; j++) M[i][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = M[r][i];
      for (let c = 0; c < 2 * n; c++) M[r][c] -= factor * M[i][c];
    }
  }
  return M.map((row) => row.slice(n));
}

export function dot(a: number[], b: number[]) {
  return a.reduce((acc, x, i) => acc + x * b[i], 0);
}

export function pearsonCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return null;
  const mx = mean(x) ?? 0;
  const my = mean(y) ?? 0;
  const num = x.reduce((acc, xi, i) => acc + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(
    x.reduce((acc, xi) => acc + (xi - mx) ** 2, 0) *
      y.reduce((acc, yi) => acc + (yi - my) ** 2, 0)
  );
  if (den === 0) return null;
  return num / den;
}

export function spearmanCorrelation(x: number[], y: number[]) {
  return pearsonCorrelation(rank(x), rank(y));
}

export function getNumericValues(data: RowData[], column: string) {
  return data
    .map((row) => row[column])
    .filter(isNumericValue)
    .map((v) => Number(v));
}

export function getPairedNumericValues(data: RowData[], x: string, y: string) {
  const out: { x: number; y: number }[] = [];
  data.forEach((row) => {
    if (isNumericValue(row[x]) && isNumericValue(row[y])) {
      out.push({ x: Number(row[x]), y: Number(row[y]) });
    }
  });
  return out;
}

export function independentTTest(x1: number[], x2: number[]): TestResult {
  const n1 = x1.length;
  const n2 = x2.length;

  if (n1 < 2 || n2 < 2) {
    return {
      title: "Independent t-test",
      statistic: null,
      pValue: null,
      df: null,
      details: ["Not enough data"],
      interpretation: [],
      derivation: [],
    };
  }

  const m1 = mean(x1) ?? 0;
  const m2 = mean(x2) ?? 0;

  const s1 = variance(x1);
  const s2 = variance(x2);

  // pooled variance
  const sp2 = ((n1 - 1) * s1 + (n2 - 1) * s2) / (n1 + n2 - 2);

  const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
  const t = (m1 - m2) / se;

  const df = n1 + n2 - 2;
  const p = approxTPValueFromZLike(t);

  const d = (m1 - m2) / Math.sqrt(sp2);

  return {
    title: "Independent t-test",
    statistic: t,
    pValue: p,
    df,
    effectSize: d,
    details: [
      `Group1 mean = ${m1}`,
      `Group2 mean = ${m2}`,
      `Difference = ${m1 - m2}`,
    ],
    derivation: [
      "sp² = pooled variance",
      "t = (x̄₁ - x̄₂) / SE",
      "SE = √[sp²(1/n₁ + 1/n₂)]",
    ],
    interpretation: [
      p < 0.05
        ? "Significant difference between groups"
        : "No significant difference between groups",
    ],
  };
}

export function pairedTTest(x: number[], y: number[]): TestResult {
  const n = Math.min(x.length, y.length);
  if (n < 2) {
    return {
      title: "Paired t-test",
      statistic: null,
      pValue: null,
      df: null,
      details: ["Not enough pairs"],
      interpretation: [],
      derivation: [],
    };
  }

  const d = x.map((xi, i) => xi - y[i]);

  const md = mean(d) ?? 0;
  const sd = stdDev(d);

  const se = sd / Math.sqrt(n);
  const t = md / se;

  const df = n - 1;
  const p = approxTPValueFromZLike(t);

  return {
    title: "Paired t-test",
    statistic: t,
    pValue: p,
    df,
    effectSize: md / sd,
    details: [
      `Mean difference = ${md}`,
      `Std dev of diff = ${sd}`,
    ],
    derivation: [
      "dᵢ = xᵢ − yᵢ",
      "t = d̄ / (s_d / √n)",
    ],
    interpretation: [
      p < 0.05
        ? "Significant change between paired observations"
        : "No significant change",
    ],
  };
}


export function linearRegression(
  data: RowData[],
  yCol: string,
  xCols: string[]
): LinearRegressionResult | null {
  const valid = data.filter((row) => {
    return (
      isNumericValue(row[yCol]) &&
      xCols.every((c) => isNumericValue(row[c]))
    );
  });

  if (valid.length < 3) return null;

  const y = valid.map((r) => Number(r[yCol]));

  // X matrix (add intercept)
  const X = valid.map((r) => [
    1,
    ...xCols.map((c) => Number(r[c])),
  ]);

  const Xt = transpose(X);
  const XtX = multiplyMatrix(Xt, X);
  const XtX_inv = inverseMatrix(XtX);
  if (!XtX_inv) return null;

  const XtY = multiplyMatrixVector(Xt, y);

  const beta = multiplyMatrixVector(XtX_inv, XtY);

  // predictions
  const yhat = multiplyMatrixVector(X, beta);
  const residuals = y.map((yi, i) => yi - yhat[i]);

  const n = y.length;
  const p = beta.length;

  const sse = sum(residuals.map((e) => e * e));
  const ybar = mean(y) ?? 0;
  const sst = sum(y.map((yi) => (yi - ybar) ** 2));

  const mse = sse / (n - p);

  const r2 = 1 - sse / sst;
  const adjR2 = 1 - (1 - r2) * ((n - 1) / (n - p));

  // variance of beta
  const varBeta = XtX_inv.map((row) =>
    row.map((v) => v * mse)
  );

  const seBeta = varBeta.map((row, i) =>
    Math.sqrt(row[i])
  );

  const tStats = beta.map((b, i) =>
    seBeta[i] === 0 ? 0 : b / seBeta[i]
  );

  const pVals = tStats.map((t) =>
    approxTPValueFromZLike(t)
  );

  return {
    beta,
    seBeta,
    tStats,
    pVals,
    yhat,
    residuals,
    r2,
    adjR2,
    mse,
    sse,
    sst,
    n,
    p,
    valid,
  };
}


export function oneSampleTTest(arr: number[], mu0 = 0): TestResult {
  if (arr.length < 2) {
    return {
      title: "One-sample t-test",
      statistic: null,
      pValue: null,
      df: null,
      effectSize: null,
      ci: null,
      details: ["At least two observations are required."],
      interpretation: ["Insufficient data for inference."],
      derivation: ["t = (x̄ - μ₀) / (s / √n)"],
    };
  }

  const n = arr.length;
  const xbar = mean(arr) ?? 0;
  const s = stdDev(arr);
  const se = s / Math.sqrt(n);

  const t = se === 0 ? 0 : (xbar - mu0) / se;
  const p = approxTPValueFromZLike(t);
  const ci = confidenceIntervalNormal(xbar, se);

  const effectSize = s === 0 ? 0 : (xbar - mu0) / s;

  return {
    title: "One-sample t-test",
    statistic: t,
    pValue: p,
    df: n - 1,
    effectSize,
    ci,
    details: [
      `Sample size n = ${n}`,
      `Sample mean x̄ = ${xbar}`,
      `Sample standard deviation s = ${s}`,
      `Standard error = ${se}`,
      `Hypothesized mean μ₀ = ${mu0}`,
    ],
    derivation: [
      "H₀: μ = μ₀",
      "H₁: μ ≠ μ₀",
      "x̄ = Σxᵢ / n",
      "s² = Σ(xᵢ - x̄)² / (n - 1)",
      "SE = s / √n",
      "t = (x̄ - μ₀) / SE",
    ],
    interpretation: [
      p < 0.05
        ? "The sample mean is significantly different from the hypothesized mean."
        : "There is not enough evidence to conclude that the sample mean differs from the hypothesized mean.",
      `95% CI for the sample mean: [${ci[0]}, ${ci[1]}]`,
    ],
  };
}
export function getCategoryCounts(data: RowData[], column: string) {
  const map = new Map<string, number>();
  data.forEach((row) => {
    const v = row[column];
    if (isMissing(v)) return;
    const k = String(v).trim();
    if (!k) return;
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export function buildSummary(data: RowData[], columns: string[]): ColumnProfile[] {
  return columns.map((col) => {
    const values = data.map((r) => r[col]);
    const nonMissing = values.filter((v) => !isMissing(v));
    return {
      name: col,
      type: detectVariableType(values),
      missing: values.length - nonMissing.length,
      unique: new Set(nonMissing.map((v) => String(v))).size,
    };
  });
}

export function detectVariableType(values: RowValue[]): VariableType {
  const nonMissing = values.filter((v) => !isMissing(v));
  if (!nonMissing.length) return "categorical";
  const unique = Array.from(new Set(nonMissing.map((v) => String(v).trim())));
  const numericCount = nonMissing.filter((v) => isNumericValue(v)).length;
  const dateCount = nonMissing.filter((v) => isDateLike(v)).length;
  if (numericCount / nonMissing.length >= 0.8) {
    if (unique.length <= 2) return "binary";
    return "numeric";
  }
  if (dateCount / nonMissing.length >= 0.8) return "date";
  if (unique.length <= 2) return "binary";
  return "categorical";
}

export function descriptiveForColumn(data: RowData[], column: string): DescriptiveStats {
  const values = getNumericValues(data, column);
  const q1 = quantile(values, 0.25);
  const q2 = median(values);
  const q3 = quantile(values, 0.75);
  const mm = minMax(values);
  return {
    n: values.length,
    mean: mean(values),
    median: q2,
    q1,
    q3,
    min: mm.min,
    max: mm.max,
    sd: stdDev(values),
    variance: variance(values),
  };
}

/* keep the rest of your analysis functions here exactly as before:
   - oneSampleTTest
   - pairedTTest
   - independentTTest
   - oneWayAnova
   - twoWayAnovaSimple
   - chiSquareTest
   - linearRegression
   - logisticRegressionBinary
   - mannWhitneyU
   - wilcoxonSignedRank
   - kruskalWallis
   - runPCA
   - runKMeans
   - kaplanMeier
   - differentialExpressionSimple
   - advancedPublicHealthModel
   - environmentalTimeSeries
*/