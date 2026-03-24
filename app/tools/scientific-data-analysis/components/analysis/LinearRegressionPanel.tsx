"use client";

import { useMemo } from "react";
import type { AnalysisPanelProps, LinearRegressionResult } from "../../types";
import { linearRegression } from "../../utils";
import SectionCard from "../shared/SectionCard";
import StatCard from "../shared/StatCard";

export default function LinearRegressionPanel({
  cleanedData,
  selectedY,
  selectedX,
  formatNumber,
}: AnalysisPanelProps) {
  const result = useMemo<LinearRegressionResult | null>(() => {
    if (!selectedY || !selectedX.length) return null;
    return linearRegression(cleanedData, selectedY, selectedX);
  }, [cleanedData, selectedY, selectedX]);

  if (!result) {
    return (
      <SectionCard title="Linear Regression" badge="Version 1">
        <div className="text-sm text-slate-500">
          Select one numeric outcome and at least one numeric predictor.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Linear Regression" badge="Version 1">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="R²" value={formatNumber(result.r2)} />
        <StatCard label="Adjusted R²" value={formatNumber(result.adjR2)} />
        <StatCard label="MSE" value={formatNumber(result.mse)} />
        <StatCard label="n" value={`${result.n}`} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Coefficient</th>
              <th className="px-4 py-3 text-left font-semibold">Estimate</th>
              <th className="px-4 py-3 text-left font-semibold">SE</th>
              <th className="px-4 py-3 text-left font-semibold">t</th>
              <th className="px-4 py-3 text-left font-semibold">p</th>
            </tr>
          </thead>
          <tbody>
            {result.beta.map((b, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-3">{i === 0 ? "Intercept" : selectedX[i - 1]}</td>
                <td className="px-4 py-3">{formatNumber(b)}</td>
                <td className="px-4 py-3">{formatNumber(result.seBeta[i])}</td>
                <td className="px-4 py-3">{formatNumber(result.tStats[i])}</td>
                <td className="px-4 py-3">{formatNumber(result.pVals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-bold">Mathematical derivation</div>
        <div className="space-y-2 font-mono text-sm text-slate-800">
          <div>y = Xβ + ε</div>
          <div>β̂ = (XᵀX)^(-1) Xᵀy</div>
          <div>Residuals: e = y − ŷ</div>
          <div>R² = 1 − SSE / SST</div>
        </div>
      </div>
    </SectionCard>
  );
}