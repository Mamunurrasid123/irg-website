export type RowValue = string | number | boolean | null | undefined;
export type RowData = Record<string, RowValue>;

export type VariableType = "numeric" | "categorical" | "binary" | "date";
export type DataSourceMode = "upload" | "manual";

export type AnalysisKey =
  | "descriptive"
  | "ttest"
  | "pairedTTest"
  | "anova1"
  | "anova2"
  | "chiSquare"
  | "correlation"
  | "linearRegression"
  | "logisticRegression"
  | "nonparametric"
  | "pca"
  | "clustering"
  | "survival"
  | "differentialExpression"
  | "publicHealth"
  | "environmentalTS";

export type ColumnProfile = {
  name: string;
  type: VariableType;
  missing: number;
  unique: number;
};

export type TestResult = {
  title: string;
  statistic: number | null;
  pValue: number | null;
  df?: number | null;
  effectSize?: number | null;
  ci?: [number, number] | null;
  details: string[];
  interpretation: string[];
  derivation: string[];
};

export type DescriptiveStats = {
  n: number;
  mean: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
  sd: number;
  variance: number;
};

export type LinearRegressionResult = {
  beta: number[];
  seBeta: number[];
  tStats: number[];
  pVals: number[];
  yhat: number[];
  residuals: number[];
  r2: number;
  adjR2: number;
  mse: number;
  sse: number;
  sst: number;
  n: number;
  p: number;
  valid: RowData[];
};

export type LogisticRegressionResult = {
  beta: number[];
  probs: number[];
  preds: number[];
  accuracy: number;
  oddsRatios: number[];
  n: number;
  valid: RowData[];
};

export type PcaResult = {
  scores: { pc1: number; pc2: number }[];
  loadings1: number[];
  loadings2: number[];
  eigen1: number;
  eigen2: number;
  explained1: number;
  explained2: number;
  n: number;
};

export type ClusteringResult = {
  labels: number[];
  centroids: number[][];
  matrix: number[][];
  n: number;
};

export type SurvivalResult = {
  curve: { time: number; survival: number; events: number; censored: number }[];
  n: number;
};

export type DifferentialExpressionResult = {
  levels: string[];
  results: {
    feature: string;
    mean1: number;
    mean2: number;
    log2fc: number;
    statistic: number | null;
    pValue: number | null;
  }[];
};

export type PublicHealthResult = {
  n: number;
  table: { a: number; b: number; c: number; d: number };
  prevalence: number;
  riskExposed: number;
  riskUnexposed: number;
  rr: number | null;
  or: number | null;
};

export type EnvironmentalTSResult = {
  points: { time: string; value: number }[];
  movingAverage: number[];
  trendCorrelation: number;
  min: number;
  max: number;
  mean: number;
};

export type AnalysisPanelProps = {
  cleanedData: RowData[];
  selectedY: string;
  selectedX: string[];
  selectedGroup: string;
  selectedGroup2: string;
  pairedX: string;
  pairedY: string;
  timeCol: string;
  eventCol: string;
  mu0: string;
  clusterK: number;
  formatNumber: (v: number | null | undefined, d?: number) => string;
};