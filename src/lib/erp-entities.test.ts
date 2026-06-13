import { describe, expect, it } from "vitest";
import {
  buildCashAccountPayload,
  buildClientPayload,
  buildTransactionPayload,
} from "@/lib/erp-entities";

describe("buildClientPayload", () => {
  it("normalizes a valid client draft", () => {
    expect(
      buildClientPayload({
        name: "  Juan Pérez ",
        phone: " 70123456 ",
        email: " juan@mail.com ",
        address: " Av. Siempre Viva ",
        notes: " cliente frecuente ",
        tags: " vip, mayorista ",
        whatsapp_id: "",
      }),
    ).toEqual({
      name: "Juan Pérez",
      phone: "70123456",
      email: "juan@mail.com",
      address: "Av. Siempre Viva",
      notes: "cliente frecuente",
      tags: ["vip", "mayorista"],
      whatsapp_id: null,
    });
  });

  it("rejects missing name", () => {
    expect(() =>
      buildClientPayload({
        name: " ",
        phone: "",
        email: "",
        address: "",
        notes: "",
        tags: "",
        whatsapp_id: "",
      }),
    ).toThrow("El nombre es obligatorio.");
  });
});

describe("buildCashAccountPayload", () => {
  it("normalizes a valid cash account draft", () => {
    expect(
      buildCashAccountPayload({
        name: " Caja principal ",
        type: "cash",
        is_default: true,
      }),
    ).toEqual({
      name: "Caja principal",
      type: "cash",
      is_default: true,
    });
  });

  it("rejects missing account name", () => {
    expect(() =>
      buildCashAccountPayload({
        name: " ",
        type: "cash",
        is_default: false,
      }),
    ).toThrow("El nombre de la caja es obligatorio.");
  });
});

describe("buildTransactionPayload", () => {
  it("normalizes a valid transaction draft", () => {
    expect(
      buildTransactionPayload({
        type: "income",
        amount: "120.5",
        category: "Ventas",
        description: "Ingreso manual",
        cash_account_id: "acc_1",
        date: "2026-06-13",
      }),
    ).toEqual({
      type: "income",
      amount: 120.5,
      category: "Ventas",
      description: "Ingreso manual",
      cash_account_id: "acc_1",
      date: "2026-06-13",
    });
  });

  it("rejects invalid amount", () => {
    expect(() =>
      buildTransactionPayload({
        type: "expense",
        amount: "-1",
        category: "",
        description: "",
        cash_account_id: "",
        date: "",
      }),
    ).toThrow("El monto debe ser un número mayor o igual a 0.");
  });
});
