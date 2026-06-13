import { test, expect } from "@playwright/test";
import { mockOwnerApi } from "./helpers/mockApi";

test("owner can access finance, settings, reports and activity surfaces", async ({ page }) => {
  await mockOwnerApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("doppel_token", "test-token");
    window.localStorage.setItem("doppel_refresh_token", "refresh-token");
  });

  await page.goto("/dashboard/finance");
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await expect(page.getByRole("heading", { name: "Nueva caja" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.goto("/dashboard/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("59170000000")).toBeVisible();

  await page.goto("/dashboard/reports");
  await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  await expect(page.getByText("Heineken 1L")).toBeVisible();

  await page.goto("/dashboard/activity");
  await expect(page.getByRole("heading", { name: "Bitácora" })).toBeVisible();
  await expect(page.getByText("Venta registrada")).toBeVisible();
});
