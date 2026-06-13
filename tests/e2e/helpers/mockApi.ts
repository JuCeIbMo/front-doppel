import type { Page, Route } from "@playwright/test";

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function mockOwnerApi(page: Page) {
  await page.route("**/auth/logout", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/erp/reports/dashboard**", async (route) => {
    await json(route, {
      period: { label: "Junio" },
      sales_total: 1500,
      sales_count: 12,
      gross_margin: 450,
      gross_margin_pct: 30,
      new_clients: 3,
      low_stock_count: 2,
    });
  });

  await page.route("**/erp/inventory/low-stock**", async (route) => {
    await json(route, [
      {
        product_id: "prod-low",
        product_name: "Heineken 1L",
        variant_id: null,
        category: "Cervezas",
        unit: "botella",
        quantity: 2,
        low_stock_threshold: 5,
      },
    ]);
  });

  await page.route("**/erp/products?**", async (route) => {
    await json(route, [
      {
        id: "prod-1",
        name: "Heineken 1L",
        description: "Botella retornable",
        sku: "HK-1",
        barcode: "123456",
        category: "Cervezas",
        image_url: null,
        cost_price: 10,
        price: 20,
        unit: "botella",
        available: true,
        has_variants: false,
        low_stock_threshold: 5,
        stock: 10,
        created_at: "2026-06-13T00:00:00Z",
      },
    ]);
  });

  await page.route("**/erp/products/prod-1", async (route) => {
    if (route.request().method() === "PUT") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      await json(route, {
        id: "prod-1",
        description: null,
        image_url: null,
        has_variants: false,
        created_at: "2026-06-13T00:00:00Z",
        stock: 10,
        ...payload,
      });
      return;
    }

    await json(route, {
      id: "prod-1",
      name: "Heineken 1L",
      description: "Botella retornable",
      sku: "HK-1",
      barcode: "123456",
      category: "Cervezas",
      image_url: null,
      cost_price: 10,
      price: 20,
      unit: "botella",
      available: true,
      has_variants: false,
      low_stock_threshold: 5,
      stock: 10,
      created_at: "2026-06-13T00:00:00Z",
    });
  });

  await page.route("**/erp/products", async (route) => {
    if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      await json(route, {
        id: "prod-new",
        description: null,
        image_url: null,
        has_variants: false,
        created_at: "2026-06-13T00:00:00Z",
        stock: 0,
        ...payload,
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/erp/products/barcode/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/123456")) {
      await json(route, {
        id: "prod-1",
        name: "Heineken 1L",
        description: "Botella retornable",
        sku: "HK-1",
        barcode: "123456",
        category: "Cervezas",
        image_url: null,
        cost_price: 10,
        price: 20,
        unit: "botella",
        available: true,
        has_variants: false,
        low_stock_threshold: 5,
        stock: 10,
        created_at: "2026-06-13T00:00:00Z",
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Not found" }),
    });
  });

  await page.route("**/erp/products/import", async (route) => {
    await json(route, { imported: 2, errors: [] });
  });

  await page.route("**/erp/products/import/template", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: "fake-xlsx-template",
    });
  });

  await page.route("**/erp/inventory?**", async (route) => {
    await json(route, [
      {
        product_id: "prod-1",
        product_name: "Heineken 1L",
        variant_id: null,
        category: "Cervezas",
        unit: "botella",
        quantity: 10,
        low_stock_threshold: 5,
      },
    ]);
  });

  await page.route("**/erp/inventory/adjustment", async (route) => {
    await json(route, {});
  });

  await page.route("**/erp/inventory/movements?**", async (route) => {
    await json(route, [
      {
        id: "mov-1",
        product_id: "prod-1",
        product_name: "Heineken 1L",
        variant_id: null,
        type: "sale",
        quantity: 2,
        unit_cost: 10,
        reference_id: "sale-1",
        notes: "Venta mostrador",
        actor: "cashier",
        created_at: "2026-06-13T12:00:00Z",
      },
    ]);
  });

  await page.route("**/erp/inventory/movements/prod-1?**", async (route) => {
    await json(route, [
      {
        id: "mov-1",
        product_id: "prod-1",
        product_name: "Heineken 1L",
        variant_id: null,
        type: "sale",
        quantity: 2,
        unit_cost: 10,
        reference_id: "sale-1",
        notes: "Venta mostrador",
        actor: "cashier",
        created_at: "2026-06-13T12:00:00Z",
      },
    ]);
  });

  await page.route("**/erp/finance/accounts", async (route) => {
    if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      await json(route, {
        id: "acc-new",
        balance: 0,
        is_active: true,
        ...payload,
      });
      return;
    }

    await json(route, [
      {
        id: "acc-1",
        name: "Caja principal",
        type: "cash",
        balance: 500,
        is_default: true,
        is_active: true,
      },
    ]);
  });

  await page.route("**/erp/finance/accounts/acc-1", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    await json(route, {
      id: "acc-1",
      balance: 500,
      ...payload,
    });
  });

  await page.route("**/erp/finance/transactions?**", async (route) => {
    await json(route, [
      {
        id: "tx-1",
        type: "income",
        amount: 100,
        category: "Ventas",
        description: "Ingreso manual",
        cash_account_id: "acc-1",
        sale_id: null,
        actor: "owner",
        date: "2026-06-13",
        created_at: "2026-06-13T10:00:00Z",
      },
    ]);
  });

  await page.route("**/erp/finance/transactions", async (route) => {
    if (route.request().method() === "POST") {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      await json(route, {
        id: "tx-new",
        actor: "owner",
        created_at: "2026-06-13T10:00:00Z",
        ...payload,
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/erp/finance/categories", async (route) => {
    await json(route, ["Ventas", "Servicios", "Logística"]);
  });

  await page.route("**/erp/activity?**", async (route) => {
    await json(route, [
      {
        id: "activity-1",
        action: "Venta registrada",
        actor: "owner",
        detail: "2x Heineken",
        created_at: "2026-06-13T10:00:00Z",
        entity_id: "sale-1",
      },
    ]);
  });

  await page.route("**/erp/activity/ai?**", async (route) => {
    await json(route, [
      {
        id: "activity-ai-1",
        title: "Bot respondió",
        actor: "bot",
        description: "Consulta de stock",
        timestamp: "2026-06-13T11:00:00Z",
      },
    ]);
  });

  await page.route("**/erp/reports/top-products", async (route) => {
    await json(route, [{ product_name: "Heineken 1L", quantity: 8, total: 160 }]);
  });

  await page.route("**/erp/reports/sales-by-period", async (route) => {
    await json(route, { data: [{ period: "2026-06-13", total: 300 }] });
  });

  await page.route("**/erp/reports/margin", async (route) => {
    await json(route, { data: [{ period: "2026-06-13", total: 90 }] });
  });

  await page.route("**/erp/reports/clients", async (route) => {
    await json(route, { data: [{ label: "Nuevos", value: 3 }] });
  });

  await page.route("**/erp/**", async (route) => {
    await json(route, []);
  });

  await page.route("**/me/**", async (route) => {
    await json(route, { phones: ["59170000000"] });
  });

  await page.route("**/auth/**", async (route) => {
    await json(route, {});
  });
}
