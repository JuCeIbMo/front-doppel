import { describe, expect, it } from "vitest";
import {
  normalizeActivityItems,
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

describe("normalizeActivityItems", () => {
  it("extracts activity entries from array payloads", () => {
    expect(
      normalizeActivityItems([
        {
          id: "act_1",
          action: "Venta registrada",
          actor: "bot",
          detail: "2x producto",
          created_at: "2026-06-13T12:00:00Z",
          entity_id: "sale_1",
        },
      ]),
    ).toEqual([
      {
        id: "act_1",
        title: "Venta registrada",
        subtitle: "bot · 2x producto",
        timestamp: "2026-06-13T12:00:00Z",
        entityId: "sale_1",
        entity_id: "sale_1",
        isAi: true,
      },
    ]);
  });

  it("detects non-AI actors", () => {
    expect(
      normalizeActivityItems([
        {
          id: "act_2",
          action: "Cliente actualizado",
          actor: "admin",
          created_at: "2026-06-13T10:00:00Z",
        },
      ]),
    ).toEqual([
      {
        id: "act_2",
        title: "Cliente actualizado",
        subtitle: "admin",
        timestamp: "2026-06-13T10:00:00Z",
        entityId: null,
        isAi: false,
      },
    ]);
  });

  it("extracts module and entity_type fields when present", () => {
    expect(
      normalizeActivityItems([
        {
          id: "act_3",
          action: "Producto editado",
          actor: "usuario",
          module: "inventory",
          entity_type: "product",
          entity_id: "prod_5",
          created_at: "2026-06-13T09:00:00Z",
        },
      ]),
    ).toEqual([
      {
        id: "act_3",
        title: "Producto editado",
        subtitle: "usuario",
        timestamp: "2026-06-13T09:00:00Z",
        entityId: "prod_5",
        entity_id: "prod_5",
        entity_type: "product",
        module: "inventory",
        isAi: false,
      },
    ]);
  });
});
