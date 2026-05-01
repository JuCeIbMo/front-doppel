"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";

type SaveStatus = "idle" | "saving" | "error";

export function ManagerSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone");
  const business = params.get("business");
  const [managerPhone, setManagerPhone] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = managerPhone.trim();
    if (!trimmed) {
      setError("Ingresa el numero manager.");
      return;
    }

    setStatus("saving");
    setError("");
    try {
      const res = await authenticatedFetch("/me/admin-phones", {
        method: "PUT",
        body: JSON.stringify({ phones: [trimmed] }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || "No se pudo guardar el numero manager.");
      }
      router.replace("/dashboard");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo guardar el numero manager.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg text-center">
        <span className="text-xl font-bold text-text-primary">Doppel</span>
        <h1 className="text-3xl font-bold text-text-primary mt-8">
          Define tu numero manager
        </h1>
        <p className="text-text-secondary mt-3">
          {business ? `${business} ya esta conectado. ` : ""}
          {phone ? `WhatsApp activo: ${phone}. ` : ""}
          Este numero sera el unico que podra darle instrucciones al agente por WhatsApp.
        </p>

        <div className="mt-8">
          <label className="block text-text-secondary text-sm mb-2">
            Numero manager
          </label>
          <input
            type="tel"
            value={managerPhone}
            onChange={(event) => setManagerPhone(event.target.value)}
            placeholder="+591 70000000"
            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-text-primary text-center text-lg placeholder:text-text-secondary/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
          />
        </div>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        <div className="mt-8 flex justify-center">
          <Button type="submit" variant="primary" disabled={status === "saving"}>
            {status === "saving" ? "Guardando..." : "Activar agente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
