"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Error</h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>La aplicación encontró un problema.</p>
          <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer" }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
