"use client";

import { useMemo } from "react";
import { DemoTour } from "./DemoTour";
import { DEMO_DASHBOARD, DEMO_INVENTORY } from "@/lib/demo-fixtures";
import { useCurrency } from "@/hooks/useCurrency";

export function DemoShell() {
  const { format } = useCurrency();
  const lowStock = useMemo(
    () => DEMO_INVENTORY.filter((r) => r.quantity <= r.low_stock_threshold),
    [],
  );

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Demo banner */}
      <div className="bg-accent/10 border-b border-accent/20 px-6 py-2 flex items-center justify-between">
        <span className="text-sm text-accent font-medium">Vista demo — datos de ejemplo</span>
        <a href="/connect" className="demo-cta text-sm bg-accent text-black px-4 py-1.5 rounded-full font-semibold hover:bg-accent/90 transition-colors">
          Solicitar acceso
        </a>
      </div>

      <DemoTour />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Resumen del negocio</h1>

        {/* Metric cards — add demo-sales-today class to first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="demo-sales-today rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-text-secondary">Ventas del mes</p>
            <p className="text-2xl font-bold mt-1">{format(DEMO_DASHBOARD.sales_total)}</p>
            <p className="text-xs text-text-secondary mt-1">{DEMO_DASHBOARD.sales_count} transacciones</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-text-secondary">Margen bruto</p>
            <p className="text-2xl font-bold mt-1">{format(DEMO_DASHBOARD.gross_margin)}</p>
            <p className="text-xs text-accent mt-1">{DEMO_DASHBOARD.gross_margin_pct}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-text-secondary">Clientes nuevos</p>
            <p className="text-2xl font-bold mt-1">{DEMO_DASHBOARD.new_clients}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-text-secondary">Alertas de stock</p>
            <p className="text-2xl font-bold mt-1">{lowStock.length}</p>
          </div>
        </div>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="demo-low-stock rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 mb-6">
            <p className="font-semibold text-yellow-400 mb-3">⚠ Alertas de stock bajo</p>
            <ul className="space-y-2">
              {lowStock.map((item) => (
                <li key={item.product_id} className="flex items-center justify-between text-sm">
                  <span>{item.product_name}</span>
                  <span className="text-yellow-400">{item.quantity} {item.unit} (umbral: {item.low_stock_threshold})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cashier mode button */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Modo caja</p>
              <p className="text-sm text-text-secondary mt-1">Tu cajero cobra desde acá, sin ver datos financieros.</p>
            </div>
            <button
              type="button"
              className="demo-cashier-btn bg-accent text-black px-4 py-2 rounded-xl font-semibold text-sm"
              onClick={() => alert("Demo: en producción abre el modo caja con PIN de cajero.")}
            >
              Abrir modo caja
            </button>
          </div>
        </div>

        {/* Cashflow chart placeholder */}
        <div className="demo-cashflow-chart rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <p className="font-semibold mb-4">Flujo de caja (demo)</p>
          <div className="grid grid-cols-7 gap-1 h-32 items-end">
            {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
              <div key={i} className="flex flex-col gap-1 items-center">
                <div className="w-full bg-accent/60 rounded-t" style={{ height: `${h}%` }} />
                <span className="text-xs text-text-secondary">{["L","M","X","J","V","S","D"][i]}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-3">En producción: gráfico interactivo con datos reales.</p>
        </div>

        {/* Final CTA */}
        <div className="text-center py-8">
          <p className="text-lg font-semibold mb-2">¿Listo para empezar?</p>
          <p className="text-text-secondary mb-4">Conectá tu WhatsApp Business y comenzá a gestionar tu negocio hoy.</p>
          <a href="/connect" className="demo-cta inline-block bg-accent text-black px-6 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors">
            Solicitar acceso →
          </a>
        </div>
      </div>
    </div>
  );
}
