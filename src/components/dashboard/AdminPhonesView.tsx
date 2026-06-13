"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authenticatedFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

type SaveStatus = "idle" | "saving" | "ok" | "error";

interface AdminPhonesPayload {
  phones: string[];
}

export function AdminPhonesView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [phones, setPhones] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authenticatedFetch("/me/admin-phones");
    if (res.status === 401) {
      clearToken();
      router.replace("/connect");
      return;
    }
    if (res.status === 404) {
      router.replace("/connect");
      return;
    }
    if (!res.ok) {
      setErrorMessage("No se pudo cargar la lista de numeros admin.");
      return;
    }
    const data: AdminPhonesPayload = await res.json();
    setPhones(data.phones || []);
  }, [router]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleAdd = () => {
    const cleaned = draft.trim();
    if (!cleaned) return;
    if (phones.includes(cleaned)) {
      setDraft("");
      return;
    }
    setPhones((current) => [...current, cleaned]);
    setDraft("");
  };

  const handleRemove = (phone: string) => {
    setPhones((current) => current.filter((p) => p !== phone));
  };

  const handleSave = async () => {
    setStatus("saving");
    setErrorMessage(null);
    try {
      const res = await authenticatedFetch("/me/admin-phones", {
        method: "PUT",
        body: JSON.stringify({ phones }),
      });
      if (!res.ok) throw new Error();
      const data: AdminPhonesPayload = await res.json();
      setPhones(data.phones || []);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setErrorMessage("No se pudo guardar la lista. Intenta otra vez.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Números admin</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Controlá qué teléfonos pueden hablar con el agente manager por WhatsApp.
        </p>
      </div>

      <DashboardNav />

      <Card>
          <CardHeader title="Números admin" />
          <p className="text-text-secondary text-sm mb-5">
            Solo los numeros listados aqui acceden al manager. Cualquier otro contacto sera
            atendido por el bot cliente. Formato libre: el servidor descarta caracteres no numericos.
          </p>

          <div className="flex flex-col gap-3 mb-5">
            {phones.length === 0 ? (
              <p className="text-text-secondary text-sm italic">
                Aun no hay numeros admin. Agrega el tuyo abajo.
              </p>
            ) : (
              phones.map((phone) => (
                <div
                  key={phone}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-bg-elevated/40"
                >
                  <span className="text-text-primary text-sm">+{phone}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(phone)}
                    aria-label={`Eliminar ${phone}`}
                    className="text-text-secondary hover:text-red-400 transition-colors text-lg leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              placeholder="+591 70000000"
            />
            <Button variant="secondary" size="sm" onClick={handleAdd}>
              Agregar
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="primary" onClick={handleSave} disabled={status === "saving"}>
              {status === "saving" ? "Guardando..." : "Guardar lista"}
            </Button>
            {status === "ok" && <span className="text-accent text-sm">Guardado</span>}
            {status === "error" && (
              <span className="text-danger text-sm">{errorMessage ?? "Error al guardar"}</span>
            )}
          </div>
      </Card>
    </div>
  );
}
