"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

type SaveStatus = "idle" | "saving" | "ok" | "error";

interface BusinessInfo {
  id: string;
  name: string;
  description: string;
  hours: string;
  address: string;
  payment_methods: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number | null;
  available: boolean;
}

interface ProductDraft {
  id: string | null;
  name: string;
  description: string;
  price: string;
  available: boolean;
}

const EMPTY_BUSINESS: Omit<BusinessInfo, "id"> = {
  name: "",
  description: "",
  hours: "",
  address: "",
  payment_methods: "",
};

const EMPTY_DRAFT: ProductDraft = {
  id: null,
  name: "",
  description: "",
  price: "",
  available: true,
};

export function BusinessView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<Omit<BusinessInfo, "id">>(EMPTY_BUSINESS);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessStatus, setBusinessStatus] = useState<SaveStatus>("idle");
  const [productStatus, setProductStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<ProductDraft>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    const [bizRes, prodRes] = await Promise.all([
      authenticatedFetch("/me/business-info"),
      authenticatedFetch("/me/products"),
    ]);

    if (bizRes.status === 401 || prodRes.status === 401) {
      clearToken();
      router.replace("/connect");
      return;
    }
    if (bizRes.status === 404 || prodRes.status === 404) {
      router.replace("/connect");
      return;
    }

    if (bizRes.ok) {
      const data: BusinessInfo = await bizRes.json();
      setInfo({
        name: data.name || "",
        description: data.description || "",
        hours: data.hours || "",
        address: data.address || "",
        payment_methods: data.payment_methods || "",
      });
    }

    if (prodRes.ok) {
      const data: Product[] = await prodRes.json();
      setProducts(data);
    }
  }, [router]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSaveInfo = async () => {
    setBusinessStatus("saving");
    try {
      const res = await authenticatedFetch("/me/business-info", {
        method: "PUT",
        body: JSON.stringify(info),
      });
      if (!res.ok) throw new Error();
      const data: BusinessInfo = await res.json();
      setInfo({
        name: data.name || "",
        description: data.description || "",
        hours: data.hours || "",
        address: data.address || "",
        payment_methods: data.payment_methods || "",
      });
      setBusinessStatus("ok");
      setTimeout(() => setBusinessStatus("idle"), 2500);
    } catch {
      setBusinessStatus("error");
      setTimeout(() => setBusinessStatus("idle"), 3000);
    }
  };

  const openCreateModal = () => {
    setModalDraft(EMPTY_DRAFT);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalDraft({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: product.price !== null && product.price !== undefined ? String(product.price) : "",
      available: product.available,
    });
    setErrorMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalDraft(EMPTY_DRAFT);
  };

  const handleSubmitProduct = async () => {
    const trimmedName = modalDraft.name.trim();
    if (!trimmedName) {
      setErrorMessage("El nombre es obligatorio.");
      return;
    }
    let priceValue: number | null = null;
    if (modalDraft.price.trim() !== "") {
      const parsed = Number(modalDraft.price);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrorMessage("El precio debe ser un numero >= 0.");
        return;
      }
      priceValue = parsed;
    }

    setProductStatus("saving");
    setErrorMessage(null);
    const payload = {
      name: trimmedName,
      description: modalDraft.description,
      price: priceValue,
      available: modalDraft.available,
    };

    try {
      let res: Response;
      if (modalDraft.id) {
        res = await authenticatedFetch(`/me/products/${modalDraft.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        res = await authenticatedFetch("/me/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error();
      await load();
      setProductStatus("ok");
      setTimeout(() => setProductStatus("idle"), 2000);
      closeModal();
    } catch {
      setProductStatus("error");
      setErrorMessage("No se pudo guardar el producto.");
      setTimeout(() => setProductStatus("idle"), 3000);
    }
  };

  const handleToggleAvailable = async (product: Product) => {
    const previous = products;
    setProducts((current) =>
      current.map((p) =>
        p.id === product.id ? { ...p, available: !p.available } : p,
      ),
    );
    try {
      const res = await authenticatedFetch(`/me/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: !product.available }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts(previous);
      setErrorMessage("No se pudo actualizar la disponibilidad.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Eliminar el producto "${product.name}"? Esta accion no se puede deshacer.`)) {
      return;
    }
    const previous = products;
    setProducts((current) => current.filter((p) => p.id !== product.id));
    try {
      const res = await authenticatedFetch(`/me/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts(previous);
      setErrorMessage("No se pudo eliminar el producto.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-text-primary font-bold text-xl">Doppel</span>
            <p className="text-text-secondary text-sm mt-1">
              Datos del negocio y catalogo que usa el bot al responder a tus clientes.
            </p>
          </div>
        </div>

        <DashboardNav />

        <Card>
          <h2 className="text-text-primary font-semibold text-base mb-2">Datos del negocio</h2>
          <p className="text-text-secondary text-sm mb-5">
            Estos campos los puede consultar el bot (tool <code className="text-accent">lookup_business_info</code>)
            cuando un cliente pregunta horarios, direccion o formas de pago.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-text-secondary text-sm mb-2">Nombre</label>
              <input
                type="text"
                value={info.name}
                onChange={(e) => setInfo((current) => ({ ...current, name: e.target.value }))}
                maxLength={200}
                placeholder="Nombre comercial"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-text-secondary text-sm mb-2">Descripcion</label>
              <textarea
                value={info.description}
                onChange={(e) => setInfo((current) => ({ ...current, description: e.target.value }))}
                maxLength={2000}
                rows={4}
                placeholder="A que se dedica el negocio, que ofrece..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm mb-2">Horarios</label>
              <input
                type="text"
                value={info.hours}
                onChange={(e) => setInfo((current) => ({ ...current, hours: e.target.value }))}
                maxLength={500}
                placeholder="Lun-Vie 9-18, Sab 10-14"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm mb-2">Direccion</label>
              <input
                type="text"
                value={info.address}
                onChange={(e) => setInfo((current) => ({ ...current, address: e.target.value }))}
                maxLength={500}
                placeholder="Calle, numero, ciudad"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-text-secondary text-sm mb-2">Formas de pago</label>
              <textarea
                value={info.payment_methods}
                onChange={(e) =>
                  setInfo((current) => ({ ...current, payment_methods: e.target.value }))
                }
                maxLength={500}
                rows={2}
                placeholder="Efectivo, transferencia, QR, tarjeta..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-5">
            <Button variant="primary" onClick={handleSaveInfo} disabled={businessStatus === "saving"}>
              {businessStatus === "saving" ? "Guardando..." : "Guardar"}
            </Button>
            {businessStatus === "ok" && <span className="text-accent text-sm">Guardado</span>}
            {businessStatus === "error" && <span className="text-red-400 text-sm">Error al guardar</span>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-text-primary font-semibold text-base">Productos</h2>
              <p className="text-text-secondary text-sm mt-1">
                El bot solo lista a los clientes los productos marcados como disponibles.
              </p>
            </div>
            <Button variant="secondary" onClick={openCreateModal} className="px-5 py-2 text-sm">
              + Agregar producto
            </Button>
          </div>

          {products.length === 0 ? (
            <p className="text-text-secondary text-sm">Aun no hay productos cargados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-white/10">
                    <th className="py-2 pr-3 font-medium">Nombre</th>
                    <th className="py-2 pr-3 font-medium">Descripcion</th>
                    <th className="py-2 pr-3 font-medium">Precio</th>
                    <th className="py-2 pr-3 font-medium">Disponible</th>
                    <th className="py-2 pr-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-white/5 last:border-b-0">
                      <td className="py-3 pr-3 text-text-primary font-medium align-top">
                        {product.name}
                      </td>
                      <td className="py-3 pr-3 text-text-secondary align-top max-w-xs">
                        <span className="line-clamp-2">{product.description || "-"}</span>
                      </td>
                      <td className="py-3 pr-3 text-text-primary align-top">
                        {product.price !== null && product.price !== undefined
                          ? product.price.toFixed(2)
                          : "-"}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailable(product)}
                          className={`w-10 h-6 rounded-full transition-colors ${
                            product.available ? "bg-accent" : "bg-white/10"
                          }`}
                          aria-label={`Disponibilidad de ${product.name}`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-black transition-transform ${
                              product.available ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3 pr-3 align-top text-right">
                        <div className="inline-flex gap-3 text-sm">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errorMessage && !modalOpen && (
            <p className="text-red-400 text-sm mt-3">{errorMessage}</p>
          )}
        </Card>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg bg-bg-primary border border-white/10 rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-text-primary font-semibold text-lg mb-4">
              {modalDraft.id ? "Editar producto" : "Nuevo producto"}
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">Nombre</label>
                <input
                  type="text"
                  value={modalDraft.name}
                  onChange={(e) =>
                    setModalDraft((current) => ({ ...current, name: e.target.value }))
                  }
                  maxLength={200}
                  placeholder="Producto o servicio"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">Descripcion</label>
                <textarea
                  value={modalDraft.description}
                  onChange={(e) =>
                    setModalDraft((current) => ({ ...current, description: e.target.value }))
                  }
                  maxLength={2000}
                  rows={3}
                  placeholder="Caracteristicas, presentacion, etc."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalDraft.price}
                    onChange={(e) =>
                      setModalDraft((current) => ({ ...current, price: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-text-secondary text-sm mb-2">Disponible</label>
                  <label className="inline-flex items-center gap-3 mt-2 text-sm text-text-primary cursor-pointer">
                    <button
                      type="button"
                      onClick={() =>
                        setModalDraft((current) => ({ ...current, available: !current.available }))
                      }
                      className={`w-12 h-7 rounded-full transition-colors ${
                        modalDraft.available ? "bg-accent" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-black transition-transform ${
                          modalDraft.available ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span>{modalDraft.available ? "Si" : "No"}</span>
                  </label>
                </div>
              </div>

              {errorMessage && (
                <p className="text-red-400 text-sm">{errorMessage}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <Button variant="ghost" onClick={closeModal} className="px-5 py-2 text-sm">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitProduct}
                disabled={productStatus === "saving"}
                className="px-5 py-2 text-sm"
              >
                {productStatus === "saving" ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
