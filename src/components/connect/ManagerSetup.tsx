"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConnectShell, ErrorNote, StepTitle, fieldClass, primaryClass } from "@/components/connect/ConnectShell";
import { runOperationOrThrow } from "@/lib/operations";

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
      setError("Ingresa el número de encargado.");
      return;
    }

    setStatus("saving");
    setError("");
    try {
      await runOperationOrThrow("set_manager_phones", { phones: [trimmed] });
      router.replace("/dashboard");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo guardar el número de encargado.");
    }
  };

  return (
    <ConnectShell stage={3} step={3} says="¿A qué número te reporto a ti?">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <StepTitle>Tu número para darme órdenes</StepTitle>
        <p className="text-sm">
          {business ? `${business} ya está conectado. ` : ""}
          {phone ? `WhatsApp activo: ${phone}. ` : ""}
          Solo este número podrá darle instrucciones a tu empleado por WhatsApp: aprobar, preguntarle cuánto
          vendiste o pedirle que cobre.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Tu número de encargado
          <input
            type="tel"
            autoComplete="tel"
            value={managerPhone}
            onChange={(event) => setManagerPhone(event.target.value)}
            placeholder="+591 70000000"
            className={fieldClass}
          />
        </label>
        <button type="submit" disabled={status === "saving"} className={primaryClass}>
          {status === "saving" ? "Guardando…" : "Listo, a trabajar"}
        </button>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
    </ConnectShell>
  );
}
