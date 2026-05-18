export function trainingDurationDaysFromRange(startDate: string, endDate: string): number {
  const s = Date.parse(startDate);
  const e = Date.parse(endDate);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return NaN;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}
