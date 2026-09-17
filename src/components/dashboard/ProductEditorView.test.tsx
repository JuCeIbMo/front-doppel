import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase", () => ({ signOut: vi.fn(), getAccessToken: vi.fn() }));
const readApi = vi.fn();
const runOperationOrThrow = vi.fn();
vi.mock("@/lib/operations", () => ({
  readApi: (path: string) => readApi(path),
  runOperationOrThrow: (name: string, payload: unknown) => runOperationOrThrow(name, payload),
}));
const uploadProductPhoto = vi.fn();
vi.mock("@/lib/products", async (original) => ({
  ...(await original<typeof import("@/lib/products")>()),
  uploadProductPhoto: (file: File) => uploadProductPhoto(file),
}));

import { ProductEditorView } from "./ProductEditorView";
import { ProductsView } from "./ProductsView";

const CAFE = {
  code: "K7M2QX",
  name: "Café",
  unit_price: "10.00",
  stock: 20,
  reserved: 3,
  archived: false,
  signed_url: "https://signed/cafe",
};

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("products", () => {
  beforeEach(() => {
    readApi.mockReset().mockResolvedValue([
      CAFE,
      { ...CAFE, code: "OLD001", name: "Té", archived: true, reserved: 0 },
    ]);
    runOperationOrThrow.mockReset().mockResolvedValue({});
    uploadProductPhoto.mockReset().mockResolvedValue("UPL0AD");
    push.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("lists what is on sale apart from what is archived", async () => {
    renderWith(<ProductsView />);

    expect(await screen.findByText("Café")).toBeInTheDocument();
    expect(screen.getByText(/17 disponibles · 3 reservados/)).toBeInTheDocument();
    expect(screen.queryByText("Té")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archivados (1)" }));

    expect(screen.getByText("Té")).toBeInTheDocument();
    expect(screen.queryByText("Café")).not.toBeInTheDocument();
  });

  it("creates a product with the photo it uploaded", async () => {
    renderWith(<ProductEditorView />);
    const photo = new File(["x"], "pan.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: " Pan " } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "2,5" } });
    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "8" } });
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Foto"), { target: { files: [photo] } });
    fireEvent.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/products"));
    expect(uploadProductPhoto).toHaveBeenCalledWith(photo);
    expect(runOperationOrThrow).toHaveBeenCalledWith("add_product", {
      name: "Pan",
      unit_price: "2.50",
      stock: 8,
      photo_upload_code: "UPL0AD",
    });
  });

  it("saves only what changed on an existing product", async () => {
    renderWith(<ProductEditorView productCode="K7M2QX" />);

    fireEvent.change(await screen.findByLabelText("Precio"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Stock contado"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/products"));
    expect(runOperationOrThrow.mock.calls).toEqual([
      ["change_price", { product_code: "K7M2QX", unit_price: "12.00" }],
      ["count_stock", { product_code: "K7M2QX", stock: 25 }],
    ]);
    expect(uploadProductPhoto).not.toHaveBeenCalled();
  });

  it("does not let a count go below what orders hold", async () => {
    renderWith(<ProductEditorView productCode="K7M2QX" />);

    fireEvent.change(await screen.findByLabelText("Stock contado"), { target: { value: "2" } });

    expect(screen.getByText(/Hay 3 reservados en pedidos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("archives after asking", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWith(<ProductEditorView productCode="K7M2QX" />);

    fireEvent.click(await screen.findByRole("button", { name: "Archivar" }));

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("archive_product", {
        product_code: "K7M2QX",
      }),
    );
  });

  it("restores an archived product", async () => {
    renderWith(<ProductEditorView productCode="OLD001" />);

    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(runOperationOrThrow).toHaveBeenCalledWith("restore_product", {
        product_code: "OLD001",
      }),
    );
  });
});
