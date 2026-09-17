import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/dates";

describe("formatDateTime", () => {
  it("writes a moment the Spanish way, whatever the browser's language", () => {
    const written = formatDateTime("2026-09-16T10:00:00Z");

    expect(written).toMatch(/16 sept? 2026/);
    expect(written).not.toMatch(/AM|PM/);
  });
});
