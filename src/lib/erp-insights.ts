export interface InsightPoint {
  label: string;
  value: number;
  secondary: number | null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const arrayCandidate = record.data ?? record.items ?? record.points ?? record.results;
    return Array.isArray(arrayCandidate) ? arrayCandidate : [];
  }
  return [];
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTopProducts(payload: unknown): InsightPoint[] {
  return asArray(payload)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const label =
        asString(record.product_name) ??
        asString(record.name) ??
        asString(record.product) ??
        asString(record.label);
      const value =
        asNumber(record.quantity) ?? asNumber(record.sales) ?? asNumber(record.value);
      const secondary = asNumber(record.total) ?? asNumber(record.revenue);
      if (!label || value === null) return null;
      return { label, value, secondary };
    })
    .filter((entry): entry is InsightPoint => Boolean(entry));
}

export function normalizeSeries(payload: unknown): InsightPoint[] {
  return asArray(payload)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const label =
        asString(record.label) ??
        asString(record.period) ??
        asString(record.date) ??
        asString(record.name);
      const value =
        asNumber(record.value) ??
        asNumber(record.total) ??
        asNumber(record.amount) ??
        asNumber(record.sales);
      const secondary = asNumber(record.previous) ?? asNumber(record.comparison);
      if (!label || value === null) return null;
      return { label, value, secondary };
    })
    .filter((entry): entry is InsightPoint => Boolean(entry));
}
