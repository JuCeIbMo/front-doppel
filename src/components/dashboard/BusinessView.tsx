"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { ApiError } from "@/lib/api-client";
import { readApi, runOperationOrThrow } from "@/lib/operations";
import { signOut } from "@/lib/supabase";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

type SaveStatus = "idle" | "saving" | "ok" | "error";

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

interface Product {
  code: string;
  name: string;
  unit_price: string;
  stock: number;
  signed_url: string | null;
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

export function BusinessView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<SaveStatus>("idle");
  const [bodies, setBodies] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [saved, setSaved] = useState<Partial<Record<KnowledgeTopic, string>>>({});
  const [savingTopic, setSavingTopic] = useState<KnowledgeTopic | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [business, knowledge, catalog] = await Promise.all([
        readApi<{ name: string }>("/dashboard/business"),
        readApi<BusinessKnowledge>("/dashboard/knowledge"),
        readApi<Product[]>("/dashboard/products"),
      ]);
      setName(business.name);
      const written = Object.fromEntries(knowledge.knowledge.map((k) => [k.topic, k.body]));
      setBodies(written);
      setSaved(written);
      setProducts(catalog);
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

  const handleSaveName = async () => {
    setNameStatus("saving");
    setErrorMessage(null);
    try {
      const result = await runOperationOrThrow<{ name: string }>("name_business", {
        name: name.trim(),
      });
      setName(result.name);
      setNameStatus("ok");
      setTimeout(() => setNameStatus("idle"), 2500);
    } catch (error) {
      setNameStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el nombre.");
    }
  };

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

  const handleChangePrice = async (product: Product) => {
    const draft = priceDrafts[product.code]?.trim();
    if (!draft) return;
    setErrorMessage(null);
    try {
      const result = await runOperationOrThrow<{ unit_price: string }>("change_price", {
        product_code: product.code,
        unit_price: draft,
      });
      setProducts((current) =>
        current.map((p) => (p.code === product.code ? { ...p, unit_price: result.unit_price } : p)),
      );
      setPriceDrafts((current) => ({ ...current, [product.code]: "" }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cambiar el precio.");
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
        <h1 className="text-xl font-semibold">Negocio y catálogo del bot</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Lo que el bot sabe de tu negocio y los productos que ofrece a tus clientes.
        </p>
      </div>

      <DashboardNav />

      {errorMessage && <p className="text-danger text-sm">{errorMessage}</p>}

      <Card>
        <CardHeader title="Nombre del negocio" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Nombre comercial"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveName}
            disabled={nameStatus === "saving" || !name.trim()}
          >
            {nameStatus === "saving" ? "Guardando..." : "Guardar"}
          </Button>
          {nameStatus === "ok" && <span className="text-accent text-sm">Guardado</span>}
        </div>
      </Card>

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

      <Card>
        <CardHeader title="Productos" />
        <p className="text-text-secondary text-sm mb-5">
          Para agregar un producto, envíale su foto al agente por WhatsApp con el nombre, precio y
          stock. Aquí puedes ver el catálogo y cambiar precios.
        </p>

        {products.length === 0 ? (
          <p className="text-text-secondary text-sm">Aún no hay productos cargados.</p>
        ) : (
          <Table>
            <Table.Head>
              <tr>
                <Table.Th>Foto</Table.Th>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Stock</Table.Th>
                <Table.Th className="text-right">Nuevo precio</Table.Th>
              </tr>
            </Table.Head>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.code}>
                  <Table.Cell className="align-top">
                    {product.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link that expires
                      <img src={product.signed_url} alt="" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      "—"
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-text-primary font-medium align-top">
                    {product.name}
                    <span className="block text-xs text-text-secondary">{product.code}</span>
                  </Table.Cell>
                  <Table.Cell className="text-text-primary align-top">{product.unit_price}</Table.Cell>
                  <Table.Cell className="text-text-primary align-top">{product.stock}</Table.Cell>
                  <Table.Cell className="align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Nuevo precio de ${product.name}`}
                        value={priceDrafts[product.code] ?? ""}
                        onChange={(e) =>
                          setPriceDrafts((current) => ({ ...current, [product.code]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-border bg-bg-elevated px-2 py-1 text-sm text-text-primary"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleChangePrice(product)}
                        disabled={!priceDrafts[product.code]?.trim()}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
}
