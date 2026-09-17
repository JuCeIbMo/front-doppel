"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import { signOut } from "@/lib/supabase";

type KnowledgeTopic =
  | "identidad"
  | "horarios"
  | "ubicacion"
  | "medios_de_pago"
  | "envios"
  | "devoluciones"
  | "preguntas_frecuentes"
  | "otros"
  | "tono"
  | "reglas"
  | "escalado";

interface BusinessKnowledge {
  knowledge: Array<{ topic: KnowledgeTopic; body: string }>;
  unwritten_topics: KnowledgeTopic[];
}

/** The topics in the order the API lists them, with what each one is for. */
const TOPICS: Array<{ id: KnowledgeTopic; label: string; hint: string }> = [
  { id: "identidad", label: "Quiénes somos", hint: "A qué se dedica el negocio y qué ofrece." },
  { id: "horarios", label: "Horarios", hint: "Lun-Vie 9-18, Sáb 10-14." },
  { id: "ubicacion", label: "Ubicación", hint: "Dirección, referencias, zona de atención." },
  { id: "medios_de_pago", label: "Medios de pago", hint: "Efectivo, transferencia, QR, tarjeta..." },
  { id: "envios", label: "Envíos", hint: "Zonas, costos y tiempos de entrega." },
  { id: "devoluciones", label: "Devoluciones", hint: "Cuándo y cómo se aceptan." },
  { id: "preguntas_frecuentes", label: "Preguntas frecuentes", hint: "Lo que más te preguntan." },
  { id: "otros", label: "Otros", hint: "Cualquier otra cosa que el bot deba saber." },
  { id: "tono", label: "Tono", hint: "Cómo debe hablar el bot: formal, cercano..." },
  { id: "reglas", label: "Reglas", hint: "Lo que el bot nunca debe hacer o prometer." },
  { id: "escalado", label: "Cuándo avisarte", hint: "En qué casos el bot te pasa la conversación." },
];

/** What the bot knows about the Business and how it serves, topic by topic. */
export function KnowledgeView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bodies, setBodies] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [saved, setSaved] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [savingTopic, setSavingTopic] = useState<KnowledgeTopic | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const knowledge = await readApi<BusinessKnowledge>("/dashboard/knowledge");
      const written = Object.fromEntries(knowledge.knowledge.map((k) => [k.topic, k.body]));
      setBodies(written);
      setSaved(written);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        void signOut();
        router.replace("/connect");
        return;
      }
      setErrorMessage("No se pudo cargar la información del negocio.");
    }
  }, [router]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSaveTopic = async (topic: KnowledgeTopic) => {
    setSavingTopic(topic);
    setErrorMessage(null);
    try {
      const body = (bodies[topic] ?? "").trim();
      await runOperationOrThrow("record_business_knowledge", { topic, body });
      setSaved((current) => ({ ...current, [topic]: body }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSavingTopic(null);
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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Lo que sabe el bot</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Con esto el bot responde a tus clientes: quiénes son, horarios, pagos, envíos y cómo
          debe atenderlos.
        </p>
      </div>

      {errorMessage && <p className="text-danger text-sm">{errorMessage}</p>}

      <Card>
        <CardHeader title="Lo que tu bot sabe" />
        <p className="text-text-secondary text-sm mb-5">
          El bot usa estos textos para responder a tus clientes. También puedes contárselos al
          agente por WhatsApp y aparecerán aquí.
        </p>
        <div className="flex flex-col gap-5">
          {TOPICS.map((topic) => {
            const body = bodies[topic.id] ?? "";
            const unchanged = body.trim() === (saved[topic.id] ?? "");
            return (
              <div key={topic.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm text-text-primary">{topic.label}</label>
                  {!saved[topic.id] && (
                    <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
                      Sin escribir
                    </span>
                  )}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBodies((current) => ({ ...current, [topic.id]: e.target.value }))}
                  maxLength={4000}
                  rows={3}
                  placeholder={topic.hint}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSaveTopic(topic.id)}
                    disabled={unchanged || !body.trim() || savingTopic === topic.id}
                  >
                    {savingTopic === topic.id ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
