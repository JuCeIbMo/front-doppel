import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Página no encontrada</h1>
        <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>La página que buscas no existe.</p>
        <Link href="/" style={{ marginTop: "1rem", display: "inline-block" }}>Volver al inicio</Link>
      </div>
    </div>
  );
}
