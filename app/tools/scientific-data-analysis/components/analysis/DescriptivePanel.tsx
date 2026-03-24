"use client";

import { useMemo } from "react";
import type { AnalysisPanelProps } from "../../types";
import { descriptiveForColumn } from "../../utils";
import StatCard from "../shared/StatCard";
import SectionCard from "../shared/SectionCard";

export default function DescriptivePanel({
  cleanedData,
  selectedY,
  formatNumber,
}: AnalysisPanelProps) {
  const result = useMemo(() => {
    if (!selectedY) return null;
    return descriptiveForColumn(cleanedData, selectedY);
  }, [cleanedData, selectedY]);

  if (!result) {
    return (
      <SectionCard title="Descriptive Statistics" badge="Version 1">
        <div className="text-sm text-slate-500">
          Select one numeric variable.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`Descriptive Statistics: ${selectedY}`} badge="Version 1">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="n" value={`${result.n}`} />
        <StatCard label="Mean" value={formatNumber(result.mean)} />
        <StatCard label="Median" value={formatNumber(result.median)} />
        <StatCard label="SD" value={formatNumber(result.sd)} />
        <StatCard label="Variance" value={formatNumber(result.variance)} />
        <StatCard label="Q1" value={formatNumber(result.q1)} />
        <StatCard label="Q3" value={formatNumber(result.q3)} />
        <StatCard label="Min / Max" value={`${formatNumber(result.min)} / ${formatNumber(result.max)}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">Mathematical derivation</div>
          <div className="space-y-2 font-mono text-sm text-slate-800">
            <div>x̄ = Σxᵢ / n</div>
            <div>s² = Σ(xᵢ − x̄)² / (n − 1)</div>
            <div>s = √s²</div>
            <div>Quartiles are computed from the ordered sample.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-bold text-slate-900">Interpretation</div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Average value is {formatNumber(result.mean)}.</li>
            <li>• Standard deviation is {formatNumber(result.sd)}.</li>
            <li>
              • The middle 50% lies between {formatNumber(result.q1)} and {formatNumber(result.q3)}.
            </li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}