import { describe, expect, it } from "vitest";
import {
  buildCashAccountUpdatePayload,
  buildMovementQuery,
} from "@/lib/erp-ops";

describe("buildMovementQuery", () => {
  it("builds the generic movements path when no product filter is provided", () => {
    expect(
      buildMovementQuery({
        productId: "",
        limit: 50,
        offset: 10,
      }),
    ).toBe("/erp/inventory/movements?limit=50&offset=10");
  });

  it("builds the product-specific movements path when product filter exists", () => {
    expect(
      buildMovementQuery({
        productId: "prod_1",
        limit: 20,
        offset: 0,
      }),
    ).toBe("/erp/inventory/movements/prod_1?limit=20&offset=0");
  });
});

describe("buildCashAccountUpdatePayload", () => {
  it("normalizes editable cash account fields", () => {
    expect(
      buildCashAccountUpdatePayload({
        name: " Caja secundaria ",
        type: "bank",
        is_default: true,
        is_active: false,
      }),
    ).toEqual({
      name: "Caja secundaria",
      type: "bank",
      is_default: true,
      is_active: false,
    });
  });

  it("rejects missing account name", () => {
    expect(() =>
      buildCashAccountUpdatePayload({
        name: " ",
        type: "cash",
        is_default: false,
        is_active: true,
      }),
    ).toThrow("El nombre de la caja es obligatorio.");
  });
});
