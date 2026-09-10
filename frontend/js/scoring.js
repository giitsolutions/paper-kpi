/* ---------------------------------------------------------
   NORMAL-DISTRIBUTION PERCENTILE CALCULATION

   The Excel sheet gives two anchors used for the curve:
     Average benchmark = 50th percentile (mean, μ)
     Best benchmark    = 90th percentile

   From those two values we derive σ using:
     Best = μ + z90 * σ
     z90 = 1.2815515655

   Then the user's KPI is converted to a Z-score and the standard
   normal CDF gives the percentile. For lower-is-better KPIs, the
   direction is reversed so a lower raw value produces a higher
   performance percentile.

   This is a normal-distribution benchmark percentile. It is not a
   true peer-company percentile because the Excel file does not
   contain the underlying peer observations.
--------------------------------------------------------- */

const AVG_PERCENTILE = 50;
const BEST_PERCENTILE = 90;
const Z_FOR_BEST = 1.2815515655446004; // Φ^-1(0.90)

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Abramowitz-Stegun style approximation of the standard normal CDF.
function normalCDF(z) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function percentileKPI(rawValue, kpi) {
  if (rawValue === "" || rawValue === undefined || rawValue === null) return null;

  const x = parseFloat(rawValue);
  if (!Number.isFinite(x)) return null;

  const { direction, best, avgEdge } = kpi;
  if (![best, avgEdge].every(Number.isFinite)) return null;

  // Average is μ (50th). Best is fixed at the 90th percentile.
  // For lower-is-better KPIs, Best < Average, so σ remains positive.
  const sigma = Math.abs(best - avgEdge) / Z_FOR_BEST;
  if (sigma === 0) return AVG_PERCENTILE;

  const z = direction === "higher"
    ? (x - avgEdge) / sigma
    : (avgEdge - x) / sigma;

  return clamp(normalCDF(z) * 100, 0, 100);
}

function scoreKPI(rawValue, kpi) {
  return percentileKPI(rawValue, kpi);
}

function scoreLabel(percentile) {
  if (percentile === null) return "Not answered";
  if (percentile < AVG_PERCENTILE) return "Below Average";
  if (percentile < BEST_PERCENTILE) return "Above Average";
  return "Best-in-Class";
}

function percentileFormula(kpi) {
  if (!kpi) return "";
  const avg = kpi.avgEdge;
  const best = kpi.best;
  const sigma = Math.abs(best - avg) / Z_FOR_BEST;
  const directionText = kpi.direction === "higher" ? "higher is better" : "lower is better";
  return `Average ${avg} = 50th (μ) | Best ${best} = 90th | σ = |Best − Average| / 1.2816 ≈ ${Number(sigma.toFixed(4))} | ${directionText}`;
}
