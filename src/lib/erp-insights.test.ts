import { describe, expect, it } from "vitest";
import {
  normalizeSeries,
  normalizeTopProducts,
} from "@/lib/erp-insights";

describe("normalizeTopProducts", () => {
  it("extracts top products from array payloads", () => {
    expect(
      normalizeTopProducts([
        { product_name: "Heineken", quantity: 8, total: 160 },
        { name: "Corona", sales: 4 },
      ]),
    ).toEqual([
      { label: "Heineken", value: 8, secondary: 160 },
      { label: "Corona", value: 4, secondary: null },
    ]);
  });
});

describe("normalizeSeries", () => {
  it("extracts a series from wrapped payloads", () => {
    expect(
      normalizeSeries({
        data: [
          { period: "2026-06-10", total: 100 },
          { label: "2026-06-11", value: 120, previous: 95 },
        ],
      }),
    ).toEqual([
      { label: "2026-06-10", value: 100, secondary: null },
      { label: "2026-06-11", value: 120, secondary: 95 },
    ]);
  });
});
