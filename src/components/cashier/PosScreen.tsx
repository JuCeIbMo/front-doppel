"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cashierSessionStore, clearCashierToken } from "@/lib/cashier-session";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { CartPanel } from "./CartPanel";
import { ProductSearch } from "./ProductSearch";
import { BarcodeScanner } from "./BarcodeScanner";
import type { CartItem, ErpProduct, CashAccountResponse } from "@/lib/erp-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const CART_STORAGE_KEY = "cashier_cart";

interface Props {
  onSessionExpired: () => void;
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function saveCartToStorage(cart: CartItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function clearCartFromStorage(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CART_STORAGE_KEY);
}

export function PosScreen({ onSessionExpired }: Props) {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();

  const [cart, setCartRaw] = useState<CartItem[]>(() => loadCartFromStorage());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAccountId, setCashAccountId] = useState("");
  const [cashAccounts, setCashAccounts] = useState<CashAccountResponse[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [networkErrorModal, setNetworkErrorModal] = useState(false);
  const [continuePromptVisible, setContinuePromptVisible] = useState(false);

  // Wrap setCart so it always syncs to sessionStorage
  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveCartToStorage(next);
      return next;
    });
  }, []);

  // On mount: check for existing cart, fetch cash accounts
  useEffect(() => {
    const stored = loadCartFromStorage();
    if (stored.length > 0) {
      setContinuePromptVisible(true);
    }

    async function fetchCashAccounts() {
      try {
        const accounts = await apiFetch<CashAccountResponse[]>("/erp/cash-accounts", {
          baseUrl: API_URL,
          session: cashierSessionStore,
        });
        setCashAccounts(accounts);
        const defaultAccount = accounts.find((a) => a.is_default && a.is_active);
        if (defaultAccount) {
          setCashAccountId(defaultAccount.id);
        } else if (accounts.length > 0) {
          setCashAccountId(accounts[0].id);
        }
      } catch {
        // Cash accounts are optional; proceed without them
      }
    }

    void fetchCashAccounts();
  }, []);

  // Cart operations
  const addToCart = useCallback((product: ErpProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.price,
          quantity: 1,
        },
      ];
    });
  }, [setCart]);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product_id === productId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.product_id !== productId);
      }
      return prev.map((i) =>
        i.product_id === productId ? { ...i, quantity: newQty } : i,
      );
    });
  }, [setCart]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }, [setCart]);

  // Barcode scanning
  async function handleBarcodeScan(code: string) {
    setScannerOpen(false);
    try {
      const product = await apiFetch<ErpProduct>(`/erp/products/barcode/${code}`, {
        baseUrl: API_URL,
        session: cashierSessionStore,
      });
      addToCart(product);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.push(`/dashboard/products/new?barcode=${encodeURIComponent(code)}`);
      } else if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
      } else {
        toast.error("Error al buscar producto por código de barras.");
      }
    }
  }

  // Confirm sale
  async function handleConfirmSale() {
    if (!isOnline || confirming || cart.length === 0) return;
    setConfirming(true);
    try {
      await apiFetch("/erp/sales", {
        baseUrl: API_URL,
        session: cashierSessionStore,
        method: "POST",
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          payment_method: paymentMethod,
          cash_account_id: cashAccountId || undefined,
        }),
      });
      navigator.vibrate?.(300);
      clearCartFromStorage();
      setCartRaw([]);
      setContinuePromptVisible(false);
      toast.success("Venta registrada");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "insufficient_stock") {
          navigator.vibrate?.([200, 100, 200]);
          toast.error(err.message);
          // Do NOT clear cart
        } else if (err.status === 401) {
          onSessionExpired();
        } else {
          setNetworkErrorModal(true);
        }
      } else {
        setNetworkErrorModal(true);
      }
    } finally {
      setConfirming(false);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          setScannerOpen(false);
          (target as HTMLInputElement).blur?.();
        }
        return;
      }

      if (e.key === "Escape") {
        setScannerOpen(false);
      }
      if (e.key === "F2") {
        e.preventDefault();
        setScannerOpen(true);
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        void handleConfirmSale();
      }
      if (e.key === "+") {
        setCart((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const next = prev.map((i) =>
            i.product_id === last.product_id
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
          saveCartToStorage(next);
          return next;
        });
      }
      if (e.key === "-") {
        setCart((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const newQty = last.quantity - 1;
          let next: CartItem[];
          if (newQty <= 0) {
            next = prev.filter((i) => i.product_id !== last.product_id);
          } else {
            next = prev.map((i) =>
              i.product_id === last.product_id ? { ...i, quantity: newQty } : i,
            );
          }
          saveCartToStorage(next);
          return next;
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, confirming, cart]);

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  function handleLogout() {
    clearCashierToken();
    onSessionExpired();
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Doppel Caja</h1>
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isOnline ? "bg-green-400" : "bg-red-500"
            }`}
          />
          {!isOnline && (
            <span className="text-sm text-red-400">Sin conexión</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          Salir
        </button>
      </header>

      {/* Continuation banner */}
      {continuePromptVisible && (
        <div className="flex items-center justify-between bg-blue-900/60 px-4 py-3 text-sm">
          <span>Tenés una venta en progreso. ¿Continuarla o descartarla?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContinuePromptVisible(false)}
              className="rounded-lg bg-blue-600 px-3 py-1 font-medium hover:bg-blue-500"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={() => {
                clearCartFromStorage();
                setCartRaw([]);
                setContinuePromptVisible(false);
              }}
              className="rounded-lg bg-gray-700 px-3 py-1 hover:bg-gray-600"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* Left column */}
        <div className="flex flex-1 flex-col gap-4">
          <ProductSearch
            onAddToCart={addToCart}
            onOpenScanner={() => setScannerOpen(true)}
            baseUrl={API_URL}
          />
          <div className="flex-1 overflow-y-auto">
            <CartPanel
              cart={cart}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
            />
          </div>
        </div>

        {/* Right column: payment + total + confirm */}
        <div className="flex flex-col gap-4 lg:w-72">
          {/* Payment method */}
          <div className="rounded-xl bg-gray-800 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Método de pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="whatsapp">WhatsApp Pay</option>
              <option value="other">Otro</option>
            </select>

            {cashAccounts.length > 0 && (
              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Cuenta de caja
                </label>
                <select
                  value={cashAccountId}
                  onChange={(e) => setCashAccountId(e.target.value)}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm text-white outline-none"
                >
                  {cashAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="rounded-xl bg-gray-800 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-3xl font-bold">${total.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {cart.length === 0
                ? "Sin productos"
                : `${cart.reduce((s, i) => s + i.quantity, 0)} unidades`}
            </p>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={() => void handleConfirmSale()}
            disabled={!isOnline || confirming || cart.length === 0}
            className="flex min-h-[3rem] w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-base font-semibold transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? "Registrando..." : "Confirmar venta"}
          </button>

          {!isOnline && (
            <p className="text-center text-xs text-red-400">
              Sin conexión — no podés registrar ventas.
            </p>
          )}

          <p className="text-center text-xs text-gray-600">
            Ctrl+Enter para confirmar · F2 para escanear · + / − última línea
          </p>
        </div>
      </div>

      {/* Barcode scanner modal */}
      {scannerOpen && (
        <BarcodeScanner
          onScanned={(code) => void handleBarcodeScan(code)}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Network error modal */}
      {networkErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Error de conexión</h2>
            <p className="mb-1 text-sm text-gray-300">
              No se pudo registrar la venta.
            </p>
            <p className="mb-6 text-sm text-gray-400">
              Verificá la conexión y tocá Reintentar. Si el problema persiste, la
              venta no se registró.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setNetworkErrorModal(false);
                  await handleConfirmSale();
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => setNetworkErrorModal(false)}
                className="flex-1 rounded-xl bg-gray-700 py-2 text-sm hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
