"use client";
import type { CartItem } from "@/lib/erp-types";

interface Props {
  cart: CartItem[];
  onUpdateQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}

export function CartPanel({ cart, onUpdateQty, onRemove }: Props) {
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="py-8 text-center text-gray-400">Carrito vacío</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {cart.map((item) => (
        <div
          key={item.product_id}
          className="flex items-center gap-3 rounded-xl bg-gray-800 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.product_name}</p>
            <p className="text-xs text-gray-400">
              ${item.unit_price.toFixed(2)} c/u
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateQty(item.product_id, -1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-700 text-sm hover:bg-gray-600"
              aria-label="Quitar uno"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.product_id, 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-700 text-sm hover:bg-gray-600"
              aria-label="Agregar uno"
            >
              +
            </button>
          </div>
          <p className="w-20 text-right text-sm font-semibold">
            ${(item.unit_price * item.quantity).toFixed(2)}
          </p>
          <button
            type="button"
            onClick={() => onRemove(item.product_id)}
            className="ml-1 text-gray-500 hover:text-red-400"
            aria-label="Eliminar producto"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex justify-between border-t border-gray-700 pt-3">
        <span className="text-sm text-gray-400">Subtotal</span>
        <span className="font-semibold">${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
