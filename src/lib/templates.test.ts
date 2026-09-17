import { describe, expect, it } from "vitest";
import { placeholderCount, renderTemplate, templateName } from "@/lib/templates";

describe("templates", () => {
  it("counts each gap once", () => {
    expect(placeholderCount("Hola {{1}}, {{1}} tu pedido {{2}}")).toBe(2);
    expect(placeholderCount("Sin huecos")).toBe(0);
  });

  it("fills the gaps it has values for", () => {
    expect(renderTemplate("Hola {{1}}, pedido {{2}}.", ["Ana"])).toBe("Hola Ana, pedido {{2}}.");
  });

  it("turns what the Owner typed into a name Meta accepts", () => {
    expect(templateName("Pedido Listo ñandú!")).toBe("pedido_listo_nandu");
  });
});
