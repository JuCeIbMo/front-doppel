"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import { signOut } from "@/lib/supabase";
import {
  TEMPLATE_CATEGORY,
  TEMPLATE_STATUS,
  placeholderCount,
  renderTemplate,
  templateName,
  type MessageTemplate,
} from "@/lib/templates";

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-accent/12 text-accent",
  PENDING: "bg-amber-500/12 text-amber-300",
  REJECTED: "bg-rose-500/12 text-rose-300",
};

/** Templates: the messages Meta lets a Business send once a Contact's 24 hours are over. */
export function TemplatesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: () => readApi<MessageTemplate[]>("/dashboard/templates"),
    // Meta takes from minutes to a day to review, so a waiting list keeps asking.
    refetchInterval: (current) =>
      current.state.data?.some((template) => template.status === "PENDING") ? 30000 : false,
  });

  if (query.error instanceof ApiError && query.error.status === 401) {
    void signOut();
    router.replace("/connect");
    return null;
  }

  const templates = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Plantillas</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          WhatsApp solo deja escribir a un cliente que no te escribió en las últimas 24 horas con
          una plantilla aprobada por Meta. Cada envío tiene costo.
        </p>
      </div>

      <NewTemplate
        taken={templates.map((template) => template.name)}
        onSubmitted={() => {
          window.setTimeout(
            () => void queryClient.invalidateQueries({ queryKey: ["templates"] }),
            3000,
          );
        }}
      />

      <Card>
        <CardHeader title="Tus plantillas" />
        {query.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
        ) : query.error ? (
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : "No se pudo cargar."}
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-text-secondary">Todavía no tienes plantillas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {templates.map((template) => (
              <li
                key={`${template.name}-${template.language}`}
                className="rounded-lg border border-border bg-bg-elevated p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{template.name}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary">
                      {TEMPLATE_CATEGORY[template.category] ?? template.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        STATUS_TONE[template.status] ?? "bg-white/8 text-text-secondary"
                      }`}
                    >
                      {TEMPLATE_STATUS[template.status] ?? template.status}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  {template.body}
                </p>
                {template.rejected_reason && (
                  <p className="mt-2 text-xs text-danger">
                    Motivo de Meta: {template.rejected_reason}. Crea una nueva corrigiéndola.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NewTemplate({ taken, onSubmitted }: { taken: string[]; onSubmitted: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"utility" | "marketing">("utility");
  const [body, setBody] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const name = templateName(title);
  const gaps = placeholderCount(body);
  const filled = Array.from({ length: gaps }, (_, index) => examples[index] ?? "");
  const nameTaken = taken.includes(name);

  const submit = useMutation({
    mutationFn: () =>
      runOperationOrThrow("submit_template", {
        name,
        category,
        body: body.trim(),
        examples: filled.map((example) => example.trim()),
      }),
    onSuccess: () => {
      toast.success("Enviada a Meta. Aparecerá en revisión en unos segundos.");
      setTitle("");
      setBody("");
      setExamples([]);
      onSubmitted();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la plantilla."),
  });

  const ready =
    name.length > 0 && !nameTaken && body.trim().length > 0 && filled.every((e) => e.trim());

  return (
    <Card>
      <CardHeader title="Nueva plantilla" />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) submit.mutate();
        }}
      >
        <Input
          label="Nombre"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Pedido listo"
          error={
            nameTaken
              ? "Ya tienes una plantilla con ese nombre."
              : name
                ? `Se guardará como ${name}`
                : undefined
          }
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
            Tipo
          </legend>
          <div className="flex gap-2">
            {(["utility", "marketing"] as const).map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                  category === option ? "bg-accent/15 text-accent" : "bg-white/5 text-text-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={option}
                  checked={category === option}
                  onChange={() => setCategory(option)}
                  className="sr-only"
                />
                {option === "utility" ? "Aviso (pedidos, pagos)" : "Promoción"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-body"
            className="text-xs font-medium uppercase tracking-wide text-text-muted"
          >
            Mensaje
          </label>
          <textarea
            id="template-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={1024}
            placeholder="Hola {{1}}, tu pedido {{2}} ya está listo para recoger."
            className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
          <p className="text-xs text-text-secondary">
            Escribe {"{{1}}"}, {"{{2}}"}… donde irá lo que cambia en cada envío. No empieces ni
            termines el mensaje con uno.
          </p>
        </div>

        {filled.map((example, index) => (
          <Input
            key={index}
            label={`Ejemplo para {{${index + 1}}}`}
            value={example}
            onChange={(event) => {
              const next = [...filled];
              next[index] = event.target.value;
              setExamples(next);
            }}
            placeholder={index === 0 ? "Ana" : "K7M2"}
          />
        ))}

        {body.trim() && (
          <p className="rounded-lg border border-border bg-bg-elevated p-3 text-sm">
            {renderTemplate(body, filled)}
          </p>
        )}

        <div>
          <Button type="submit" disabled={!ready || submit.isPending}>
            {submit.isPending ? "Enviando..." : "Enviar a revisión"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
