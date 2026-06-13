import { test, expect } from "@playwright/test";
import { mockOwnerApi } from "./helpers/mockApi";

test("owner can load dashboard and navigate core ERP modules", async ({ page }) => {
  await mockOwnerApi(page);

  await page.addInitScript(() => {
    window.localStorage.setItem("doppel_token", "test-token");
    window.localStorage.setItem("doppel_refresh_token", "refresh-token");
  });

  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Resumen operativo" })).toBeVisible();
  await page.getByRole("link", { name: "Productos" }).click();
  await expect(page.getByRole("heading", { name: "Catálogo ERP" })).toBeVisible();
  await page.getByRole("link", { name: "Inventario" }).click();
  await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();
});
