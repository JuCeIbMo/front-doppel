import { describe, expect, it } from "vitest";
import { photoProblem, priceInput, stockInput } from "./products";

describe("products", () => {
  it("reads a price with a comma or a dot, and nothing else", () => {
    expect(priceInput("12,5")).toBe("12.50");
    expect(priceInput(" 3 ")).toBe("3.00");
    expect(priceInput("1.234")).toBeNull();
    expect(priceInput("-1")).toBeNull();
    expect(priceInput("")).toBeNull();
  });

  it("reads a stock as a whole number from zero up", () => {
    expect(stockInput("0")).toBe(0);
    expect(stockInput("12")).toBe(12);
    expect(stockInput("1.5")).toBeNull();
    expect(stockInput("")).toBeNull();
  });

  it("refuses a file that is not a JPG, PNG or WEBP of at most 5 MB", () => {
    expect(photoProblem(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBeNull();
    expect(photoProblem(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPG/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "b.png", { type: "image/png" });
    expect(photoProblem(big)).toMatch(/5 MB/);
  });
});
