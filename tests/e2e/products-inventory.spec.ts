import { test, expect } from "@playwright/test";
import { mockOwnerApi } from "./helpers/mockApi";

test("owner can navigate product and inventory operational flows", async ({ page }) => {
  await mockOwnerApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("doppel_token", "test-token");
    window.localStorage.setItem("doppel_refresh_token", "refresh-token");
  });

  await page.goto("/dashboard/products");
  await expect(page.getByRole("heading", { name: "Catálogo ERP" })).toBeVisible();

  await page.getByRole("link", { name: "Nuevo producto" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo producto" })).toBeVisible();
  await page.locator('input').filter({ hasText: "" }).first();
  await page.getByLabel("Nombre").fill("Producto test");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products\/prod-new$/);

  await page.goto("/dashboard/products");
  await page.getByLabel("Buscar por código de barras").fill("000999");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products\/new\?barcode=000999$/);

  await page.goto("/dashboard/inventory");
  await page.getByRole("link", { name: "Ver movimientos" }).click();
  await expect(page.getByRole("heading", { name: "Movimientos de inventario" })).toBeVisible();
  await expect(page.getByText("Venta mostrador")).toBeVisible();
});
