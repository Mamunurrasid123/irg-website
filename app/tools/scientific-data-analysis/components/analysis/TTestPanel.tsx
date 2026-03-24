"use client";

import { useMemo } from "react";
import type { AnalysisPanelProps, TestResult } from "../../types";
import {
  getNumericValues,
  independentTTest,
  oneSampleTTest,
} from "../../utils";
import StatCard from "../shared/StatCard";
import SectionCard from "../shared/SectionCard";

export default function TTestPanel({
  cleanedData,
  selectedY,
  selectedGroup,
  mu0,
  formatNumber,
}: AnalysisPanelProps) {
  const result = useMemo<TestResult | null>(() => {
    if (!selectedY) return null;

    if (selectedGroup) {
      const levels = Array.from(
        new Set(cleanedData.map((r) => String(r[selectedGroup] ?? "")).filter(Boolean))
      );
      if (levels.length !== 2) return null;

      const g1 = cleanedData
        .filter((r) => String(r[selectedGroup]) === levels[0])
        .map((r) => r[selectedY])
        .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(Number);

      const g2 = cleanedData
        .filter((r) => String(r[selectedGroup]) === levels[1])
        .map((r) => r[selectedY])
        .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(Number);

      return independentTTest(g1, g2);
    }

    return oneSampleTTest(getNumericValues(cleanedData, selectedY), Number(mu0 || 0));
  }, [cleanedData, selectedY, selectedGroup, mu0]);

  if (!result) {
    return (
      <SectionCard title="t-Test" badge="Version 1">
        <div className="text-sm text-slate-500">
          Select one numeric variable. Add a grouping variable with exactly 2 groups for an independent t-test, or leave it empty for a one-sample t-test.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={result.title} badge="Version 1">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Statistic" value={formatNumber(result.statistic)} />
        <StatCard label="p-value" value={formatNumber(result.pValue)} />
        <StatCard label="df" value={formatNumber(result.df)} />
        <StatCard label="Effect size" value={formatNumber(result.effectSize)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">Details</div>
          <ul className="space-y-2 text-sm text-slate-700">
            {result.details.map((line, i) => <li key={i}>• {line}</li>)}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">Derivation</div>
          <ul className="space-y-2 font-mono text-sm text-slate-800">
            {result.derivation.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">Interpretation</div>
          <ul className="space-y-2 text-sm text-slate-700">
            {result.interpretation.map((line, i) => <li key={i}>• {line}</li>)}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}