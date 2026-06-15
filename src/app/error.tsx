"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Algo salió mal</h1>
        <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>Ocurrió un error inesperado. Intenta de nuevo.</p>
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid currentColor", cursor: "pointer" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
