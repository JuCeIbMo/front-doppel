"use client";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { cashierSessionStore } from "@/lib/cashier-session";
import type { ErpProduct } from "@/lib/erp-types";

interface Props {
  onAddToCart: (product: ErpProduct) => void;
  onOpenScanner: () => void;
  baseUrl: string;
  onResultsChange?: (results: ErpProduct[]) => void;
}

export function ProductSearch({ onAddToCart, onOpenScanner, baseUrl, onResultsChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ErpProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    let abortController: AbortController;
    debounceRef.current = setTimeout(async () => {
      abortController = new AbortController();
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: query.trim(), limit: "20" });
        const data = await apiFetch<ErpProduct[]>(`/erp/products?${params.toString()}`, {
          baseUrl,
          session: cashierSessionStore,
          signal: abortController.signal,
        });
        setResults(data);
        setOpen(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortController?.abort();
    };
  }, [query, baseUrl]);

  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  function handleSelect(product: ErpProduct) {
    onAddToCart(product);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      setResults([]);
      setOpen(false);
    }
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    }
  }

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar producto..."
          className="w-full rounded-xl bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-400 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 animate-spin text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </span>
        )}

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-xl bg-gray-800 shadow-lg ring-1 ring-gray-700">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
            ) : (
              <ul>
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{product.name}</p>
                        {product.category && (
                          <p className="truncate text-xs text-gray-400">{product.category}</p>
                        )}
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <p className="font-semibold">${product.price.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Stock: {product.stock ?? "—"}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenScanner}
        className="flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-3 text-sm font-medium hover:bg-gray-600"
        aria-label="Escanear código de barras"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h-4a2 2 0 00-2 2v4m6 6v4a2 2 0 01-2 2h-4M9 9h6v6H9z"
          />
        </svg>
        Escanear código
      </button>
    </div>
  );
}
