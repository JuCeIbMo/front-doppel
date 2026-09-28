"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { useToggleBot, useWhatsappLine } from "@/lib/pipeline";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import type { Schema } from "@/lib/api-types";

type KnowledgeTopic = Schema<"KnowledgeTopic">;
type BusinessKnowledge = Schema<"BusinessKnowledge">;

/** The topics in the spec's order, with what each one is for. */
const TOPICS: Array<{ id: KnowledgeTopic; label: string; hint: string }> = [
  { id: "identidad", label: "Quiénes somos", hint: "Qué es el negocio y qué lo hace distinto." },
  { id: "horarios", label: "Horarios", hint: "Días y horas de atención. Ej.: Lun-Vie 9-18, Sáb 10-14." },
  { id: "ubicacion", label: "Ubicación", hint: "Dirección, referencias, link de mapa." },
  { id: "medios_de_pago", label: "Medios de pago", hint: "Cuentas, QR, efectivo, tarjeta." },
  { id: "envios", label: "Envíos", hint: "Zonas, costos y tiempos de entrega." },
  { id: "devoluciones", label: "Devoluciones", hint: "Qué se acepta y cómo." },
  { id: "preguntas_frecuentes", label: "Preguntas frecuentes", hint: "Lo que más te preguntan." },
  { id: "tono", label: "Cómo habla el bot", hint: "Formal, cercano, con emojis…" },
  { id: "reglas", label: "Reglas", hint: "Lo que el bot nunca debe hacer, decir o prometer." },
  { id: "escalado", label: "Cuándo avisarte", hint: "En qué casos el bot te pasa la conversación." },
  { id: "otros", label: "Otros", hint: "Todo lo demás que el bot deba saber." },
];

/** Whether the bot answers the Business's clients, and the switch to turn it on or off. */
function BotSwitch() {
  const line = useWhatsappLine();
  const bot = useToggleBot(line.data ?? null);
  if (line.isLoading) return <div className="h-24 animate-pulse bg-paper-rule/40" />;
  if (!line.data) {
    return (
      <div className="border-2 border-ink px-4 py-4">
        <p className="text-[15px] font-bold">El bot no tiene WhatsApp todavía.</p>
        <Link href="/dashboard/automation" className="text-sm font-bold underline underline-offset-4">
          Conectar WhatsApp
        </Link>
      </div>
    );
  }
  const on = line.data.public_agent_enabled;
  return (
    <div
      className={`chakana flex flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-6 text-paper sm:px-6 ${on ? "bg-settled" : "bg-waiting"}`}
    >
      <div>
        <p className="font-display text-2xl font-black leading-tight [font-stretch:78%]">
          {on ? "El bot está atendiendo a tus clientes" : "El bot está apagado"}
        </p>
        <p className="mt-1 text-[15px]">
          {on
            ? `Responde en ${line.data.display_phone_number}, a cualquier hora.`
            : "Nadie responde a tus clientes hasta que lo vuelvas a encender."}
        </p>
        {bot.error && <p className="mt-1 font-hand text-base font-bold">{bot.error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Bot atendiendo clientes"
        disabled={bot.toggling}
        onClick={() => {
          if (
            on &&
            !confirm("¿Apagar el bot? Nadie va a responder a tus clientes hasta que lo vuelvas a encender.")
          ) {
            return;
          }
          void bot.toggle();
        }}
        className="min-h-11 border-2 border-paper px-5 text-[15px] font-bold transition-colors hover:bg-paper hover:text-ink disabled:opacity-60"
      >
        {bot.toggling ? "Cambiando…" : on ? "Apagar" : "Encender"}
      </button>
    </div>
  );
}

/** What the bot knows about the Business and how it serves, topic by topic. */
export function KnowledgeView() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [bodies, setBodies] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [saved, setSaved] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [savingTopic, setSavingTopic] = useState<KnowledgeTopic | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      // Through the query cache so a 401 reaches the one handler in AppProviders.
      const knowledge = await queryClient.fetchQuery({
        queryKey: ["knowledge"],
        queryFn: () => readApi<BusinessKnowledge>("/dashboard/knowledge"),
        retry: false,
      });
      const written = Object.fromEntries(knowledge.knowledge.map((k) => [k.topic, k.body]));
      setBodies(written);
      setSaved(written);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      // Empty boxes would invite overwriting what is already saved, so none are shown.
      setLoadFailed(true);
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar lo que sabe el bot.",
      );
    }
  }, [queryClient]);

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
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-8 w-40 animate-pulse bg-paper-rule/50" />
        <div className="h-24 animate-pulse bg-paper-rule/40" />
        <div className="h-64 animate-pulse bg-paper-rule/30" />
      </div>
    );
  }

  const written = TOPICS.filter((topic) => saved[topic.id]).length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1>El bot</h1>
        <p className="text-sm text-text-secondary">
          Enciéndelo o apágalo, y cuéntale lo que tiene que saber de tu negocio.
        </p>
      </div>

      <BotSwitch />

      {errorMessage && (
        <p role="alert" className="font-hand text-lg font-bold text-danger">
          {errorMessage}
        </p>
      )}

      {!loadFailed && (
        <section aria-labelledby="knowledge-title">
          <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <h2 id="knowledge-title" className="text-2xl leading-tight">
              Lo que sabe de tu negocio
            </h2>
            <p className="font-display text-2xl font-black text-steps tabular-nums [font-stretch:78%]">
              {written}/{TOPICS.length}
            </p>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            El bot responde con estos textos. También puedes contárselos a tu asistente por
            WhatsApp y aparecen aquí.
          </p>
          <ul className="mt-2">
            {TOPICS.map((topic) => {
              const body = bodies[topic.id] ?? "";
              const has = Boolean(saved[topic.id]);
              const unchanged = body.trim() === (saved[topic.id] ?? "");
              return (
                <li key={topic.id} className="border-b border-paper-rule">
                  <details className="group" open={!has && topic.id === TOPICS.find((t) => !saved[t.id])?.id}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${has ? "border-settled bg-settled text-paper" : "border-ink"}`}
                      >
                        {has && <Check size={14} strokeWidth={3.5} />}
                      </span>
                      <span className="flex-1 text-[15px] font-semibold">{topic.label}</span>
                      {!has && (
                        <span className="font-hand text-base font-bold text-ink-muted">falta</span>
                      )}
                      <ChevronDown
                        aria-hidden
                        size={18}
                        className="text-ink-muted transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="pb-4 pl-9">
                      <label className="sr-only" htmlFor={`topic-${topic.id}`}>
                        {topic.label}
                      </label>
                      <textarea
                        id={`topic-${topic.id}`}
                        value={body}
                        onChange={(e) =>
                          setBodies((current) => ({ ...current, [topic.id]: e.target.value }))
                        }
                        maxLength={4000}
                        rows={4}
                        placeholder={topic.hint}
                        className="w-full resize-y border border-ink/35 bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted/80 outline-none focus:border-ink"
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          onClick={() => handleSaveTopic(topic.id)}
                          disabled={unchanged || !body.trim() || savingTopic === topic.id}
                        >
                          {savingTopic === topic.id ? "Guardando…" : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
