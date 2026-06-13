import { describe, expect, it } from "vitest";
import {
  buildInventoryAdjustmentPayload,
  buildProductPayload,
} from "@/lib/erp-forms";

describe("buildProductPayload", () => {
  it("normalizes a valid product draft into the ERP payload", () => {
    const result = buildProductPayload({
      name: "  Heineken 1L  ",
      description: " Lager ",
      sku: " HX-1 ",
      barcode: " 123456 ",
      category: " Cervezas ",
      image_url: "",
      cost_price: "12.5",
      price: "20",
      unit: "botella",
      available: true,
      low_stock_threshold: "4",
    });

    expect(result).toEqual({
      name: "Heineken 1L",
      description: "Lager",
      sku: "HX-1",
      barcode: "123456",
      category: "Cervezas",
      image_url: null,
      cost_price: 12.5,
      price: 20,
      unit: "botella",
      available: true,
      low_stock_threshold: 4,
    });
  });

  it("rejects invalid required and numeric fields", () => {
    expect(() =>
      buildProductPayload({
        name: " ",
        description: "",
        sku: "",
        barcode: "",
        category: "",
        image_url: "",
        cost_price: "-1",
        price: "x",
        unit: "",
        available: true,
        low_stock_threshold: "-3",
      }),
    ).toThrow("El nombre es obligatorio.");
  });
});

describe("buildInventoryAdjustmentPayload", () => {
  it("builds a payload using an absolute new quantity", () => {
    const result = buildInventoryAdjustmentPayload({
      product_id: "prod_1",
      variant_id: "",
      mode: "set",
      quantity: "18",
      note: "Conteo físico",
    });

    expect(result).toEqual({
      product_id: "prod_1",
      variant_id: null,
      new_quantity: 18,
      note: "Conteo físico",
    });
  });

  it("builds a payload using a delta adjustment", () => {
    const result = buildInventoryAdjustmentPayload({
      product_id: "prod_1",
      variant_id: "var_1",
      mode: "delta",
      quantity: "-2",
      note: "Merma",
    });

    expect(result).toEqual({
      product_id: "prod_1",
      variant_id: "var_1",
      delta: -2,
      note: "Merma",
    });
  });

  it("rejects missing note and invalid quantity", () => {
    expect(() =>
      buildInventoryAdjustmentPayload({
        product_id: "prod_1",
        variant_id: "",
        mode: "set",
        quantity: "",
        note: " ",
      }),
    ).toThrow("La nota es obligatoria.");
  });
});
