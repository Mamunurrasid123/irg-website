
export type SurveyChartType = "bar" | "pie";

export type SurveyAnalyzerInfo = {
  title: string;
  description: string;
  features: string[];
  supportedOutputs: string[];
};

export const surveyAnalyzerInfo: SurveyAnalyzerInfo = {
  title: "Survey Data Analyzer",
  description:
    "Upload survey datasets and receive instant summaries including frequency tables, percentages, response distributions, and simple graphical outputs.",
  features: [
    "Frequency and percentage summaries",
    "Categorical response analysis",
    "Bar charts and pie charts for survey questions",
    "Likert scale scoring and summary statistics",
    "Multiple-question dashboard",
    "Useful for student projects, theses, and NGO surveys",
  ],
  supportedOutputs: [
    "Frequency table",
    "Percentage table",
    "Valid response count",
    "Missing response count",
    "Bar chart",
    "Pie chart",
    "Likert score summary",
    "Dashboard across multiple questions",
    "Mathematical explanation",
    "Interpretation notes",
    "PDF export",
    "Copy report text",
  ],
};

export const surveyColorPalette: string[] = [
  "#3366CC",
  "#DC3912",
  "#FF9900",
  "#109618",
  "#990099",
  "#0099C6",
  "#DD4477",
  "#66AA00",
  "#B82E2E",
  "#316395",
  "#994499",
  "#22AA99",
];

export const defaultLikertMap: Record<string, number> = {
  "Strongly Disagree": 1,
  Disagree: 2,
  Neutral: 3,
  Agree: 4,
  "Strongly Agree": 5,
  Never: 1,
  Rarely: 2,
  Sometimes: 3,
  Often: 4,
  Always: 5,
  "Very Poor": 1,
  Poor: 2,
  Average: 3,
  Good: 4,
  Excellent: 5,
};

export type CleaningIssueType =
  | "missing"
  | "duplicate"
  | "format"
  | "inconsistent"
  | "whitespace"
  | "case";

export type DatasetCleaningInfo = {
  title: string;
  description: string;
  features: string[];
  supportedOutputs: string[];
};

export const datasetCleaningInfo: DatasetCleaningInfo = {
  title: "Dataset Cleaning Tool",
  description:
    "Upload datasets to identify and clean common data issues such as missing values, duplicate rows, inconsistent entries, and formatting problems.",
  features: [
    "Missing value detection",
    "Duplicate row identification",
    "Column format checking",
    "Cleaner, analysis-ready datasets",
  ],
  supportedOutputs: [
    "Missing value summary",
    "Duplicate row summary",
    "Column type and format checks",
    "Inconsistent category detection",
    "Whitespace cleaning",
    "Case standardization",
    "Cleaned dataset preview",
    "Download cleaned dataset",
    "Download cleaning report",
    "Mathematical and analytical cleaning summary",
  ],
};

export const missingTokensDefault: string[] = [
  "",
  "na",
  "n/a",
  "nan",
  "null",
  "none",
  "-",
  "--",
  "?",
  "not available",
  "missing",
];

export const standardizationOptions: Array<{ value: string; label: string }> = [
  { value: "none", label: "No case standardization" },
  { value: "lower", label: "Convert text to lowercase" },
  { value: "upper", label: "Convert text to uppercase" },
  { value: "title", label: "Convert text to title case" },
];


export const tools = [
  {
    title: "Excel Summary Generator",
    description:
      "Upload Excel or CSV files and automatically generate descriptive summaries including number of observations, variable types, missing values, mean, median, standard deviation, minimum, and maximum.",
    href: "/tools/excel-summary",
    features: [
      "Upload Excel or CSV datasets",
      "Automatic descriptive statistics",
      "Missing value summary",
      "Quick overview of numerical and categorical variables",
    ],
  },
  {
    title: "Regression Tool",
    description:
      "Run regression analysis directly from uploaded datasets by selecting dependent and independent variables.",
     href: "/tools/regression",
    features: [
      "Linear regression analysis",
      "Variable selection interface",
      "Regression coefficients and fitted equation",
      "Useful for student and research projects",
    ],
  },
  {
    title: "P-value Calculator",
    description:
      "Calculate p-values for common statistical tests to help users evaluate evidence against a null hypothesis.",
    href: "/tools/p-value-calculator",
    features: [
      "Fast p-value computation",
      "Supports common testing scenarios",
      "Beginner-friendly interface",
      "Useful for classroom and research use",
    ],
  },
  {
    title: "Confidence Interval Calculator",
    description:
      "Compute confidence intervals for means, proportions, and other common quantities.",
    href: "/tools/confidence-interval-calculator",
    features: [
      "Confidence interval estimation",
      "Supports standard statistical settings",
      "Clear interval interpretation",
      "Useful for assignments, projects, and reports",
    ],
  },
  {
    title: "Hypothesis Testing Tool",
    description:
      "Perform common hypothesis tests and obtain test statistics, p-values, and decision summaries.",
    href: "/tools/hypothesis-testing-tool",
    features: [
      "Common hypothesis testing workflows",
      "Test statistic and p-value output",
      "Decision support at chosen significance level",
      "Suitable for teaching and learning",
    ],
  },
  {
    title: "Dataset Visualization Tool",
    description:
      "Generate visual representations of uploaded datasets such as histograms, bar charts, scatter plots, line graphs, and box plots.",
    href: "/tools/dataset-visualization-tool",
    features: [
      "Automatic chart generation",
      "Histogram, scatter plot, bar chart, and box plot options",
      "Helpful for exploratory data analysis",
      "Presentation-ready visual outputs",
    ],
  },
  {
    title: "Survey Data Analyzer",
    description:
      "Upload survey datasets and receive instant summaries including frequency tables, percentages, response distributions, and simple graphical outputs.",
    href: "/tools/survey-data-analyzer",
    features: [
      "Frequency and percentage summaries",
      "Categorical response analysis",
      "Bar charts and pie charts for survey questions",
      "Useful for student projects, theses, and NGO surveys",
    ],
  },
  {
    title: "Dataset Cleaning Tool",
    description:
      "Upload datasets to identify and clean common data issues such as missing values, duplicate rows, inconsistent entries, and formatting problems.",
    href: "/tools/dataset-cleaning-tool",
    features: [
      "Missing value detection",
      "Duplicate row identification",
      "Column format checking",
      "Cleaner, analysis-ready datasets",
    ],
  },{
  title: "Scientific Calculator",
  description:
    "Perform advanced mathematical calculations including trigonometric, logarithmic, exponential, and algebraic operations with a clean and interactive scientific calculator.",
  href: "/tools/scientific-calculator",
  features: [
    "Arithmetic and scientific operations",
    "Trigonometric and logarithmic functions",
    "Degree and radian modes",
    "Clean, interactive, and well-designed interface",
  ],
}
];