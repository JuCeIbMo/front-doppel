"use client";

import { useEffect } from "react";

const TOUR_KEY = "demo_tour_done";

export function DemoTour() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(TOUR_KEY)) return;

    let driver: { drive: () => void; destroy: () => void } | null = null;
    let isMounted = true;

    import("driver.js").then(({ driver: createDriver }) => {
      if (!isMounted) return;
      driver = createDriver({
        showProgress: true,
        steps: [
          {
            element: ".demo-sales-today",
            popover: {
              title: "Ventas del día",
              description: "Aquí ves tus ventas del día en tiempo real, comparadas con ayer.",
              side: "bottom",
            },
          },
          {
            element: ".demo-low-stock",
            popover: {
              title: "Alertas de stock",
              description: "El sistema te avisa cuando un producto se está por agotar.",
              side: "bottom",
            },
          },
          {
            element: ".demo-cashier-btn",
            popover: {
              title: "Modo caja",
              description: "Tu cajero cobra desde acá, sin ver datos financieros.",
              side: "left",
            },
          },
          {
            element: ".demo-cashflow-chart",
            popover: {
              title: "Flujo de caja",
              description: "Visualizá entradas y salidas por día, semana o mes.",
              side: "top",
            },
          },
          {
            element: ".demo-cta",
            popover: {
              title: "¡Listo!",
              description: "¿Listo? Empezá hoy mismo.",
              side: "top",
            },
          },
        ],
        onDestroyStarted: () => {
          sessionStorage.setItem(TOUR_KEY, "true");
          driver?.destroy();
        },
      });

      driver.drive();
    });

    return () => {
      isMounted = false;
      driver?.destroy();
    };
  }, []);

  return null;
}
