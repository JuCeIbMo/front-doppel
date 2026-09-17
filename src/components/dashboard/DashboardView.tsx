"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";
import { readApi, runOperation, runOperationOrThrow } from "@/lib/operations";
import { placeholderCount, renderTemplate, type MessageTemplate } from "@/lib/templates";
import { signOut } from "@/lib/supabase";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { WhatsAppDisconnectedNotice } from "@/components/dashboard/WhatsAppDisconnectedNotice";
import {
  buildConversationSummaries,
  canReplyFreely,
  filterConversations,
  readConversationMetaMap,
  writeConversationMetaMap,
  type ConversationFilter,
  type ConversationMeta,
  messageText,
  type ConversationSummary,
  type LeadStatus,
  type PipelineConversation,
  type PipelineMessage,
} from "@/components/dashboard/automation-crm";

interface Business {
  id: string;
  name: string;
}

interface WhatsappLine {
  phone_number_id: string;
  display_phone_number: string;
  public_agent_enabled: boolean;
}

/** How often the inbox asks for new messages. */
const REFRESH_MS = 5000;

const FILTER_OPTIONS: Array<{ id: ConversationFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "unread", label: "Sin leer" },
  { id: "warm", label: "Calientes" },
  { id: "pending", label: "Pendientes" },
];

const LEAD_STATUS_OPTIONS: Array<{ id: LeadStatus; label: string }> = [
  { id: "new", label: "Nuevo" },
  { id: "contacted", label: "Contactado" },
  { id: "warm", label: "Caliente" },
  { id: "negotiation", label: "Negociación" },
  { id: "customer", label: "Cliente" },
  { id: "no_response", label: "Sin respuesta" },
];

const statusTone: Record<LeadStatus, string> = {
  new: "bg-white/6 text-text-secondary border border-white/8",
  contacted: "bg-sky-500/10 text-sky-300 border border-sky-400/20",
  warm: "bg-amber-500/12 text-amber-300 border border-amber-400/20",
  negotiation: "bg-violet-500/12 text-violet-300 border border-violet-400/20",
  customer: "bg-accent/12 text-accent border border-accent/20",
  no_response: "bg-rose-500/12 text-rose-300 border border-rose-400/20",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatRelativeTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatThreadDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupMessagesByDay(messages: PipelineMessage[]) {
  const groups = new Map<string, PipelineMessage[]>();

  for (const message of messages) {
    const key = new Date(message.created_at).toISOString().slice(0, 10);
    const day = groups.get(key) ?? [];
    day.push(message);
    groups.set(key, day);
  }

  return Array.from(groups.entries());
}

function getSummaryText(isConnected: boolean, totalConversations: number, businessName: string | null) {
  if (!isConnected) {
    return "Reconecta tu línea para reactivar el inbox y el seguimiento comercial.";
  }

  if (totalConversations === 0) {
    return `${businessName ?? "Tu negocio"} está conectado. El inbox se activará cuando lleguen nuevos mensajes.`;
  }

  return `${businessName ?? "Tu negocio"} tiene ${totalConversations} conversaciones operativas listas para seguimiento.`;
}

function getPipelineCount(conversations: ConversationSummary[], statuses: LeadStatus[]) {
  return conversations.filter((conversation) => statuses.includes(conversation.leadStatus)).length;
}

export function DashboardView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [line, setLine] = useState<WhatsappLine | null>(null);
  const [pipeline, setPipeline] = useState<PipelineConversation[]>([]);
  const [messages, setMessages] = useState<PipelineMessage[]>([]);
  const [botError, setBotError] = useState("");
  const [togglingBot, setTogglingBot] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [metaByPhone, setMetaByPhone] = useState<Record<string, ConversationMeta>>({});

  const loadDashboard = useCallback(async () => {
    const [businessRes, lineRes, phonesRes, pipelineRes] = await Promise.all([
      authenticatedFetch("/dashboard/business"),
      authenticatedFetch("/dashboard/whatsapp-line"),
      authenticatedFetch("/dashboard/manager-phones"),
      authenticatedFetch("/dashboard/pipeline"),
    ]);

    if (businessRes.status === 401) {
      void signOut();
      router.replace("/connect");
      return;
    }

    const businessData: Business = await businessRes.json();
    setBusiness(businessData);
    setMetaByPhone(readConversationMetaMap(businessData.id));

    const lineData: WhatsappLine | null = lineRes.ok ? await lineRes.json() : null;
    setLine(lineData);

    if (lineData && phonesRes.ok) {
      const phones: Array<{ phone: string }> = await phonesRes.json();
      if (phones.length === 0) {
        const params = new URLSearchParams();
        params.set("phone", lineData.display_phone_number);
        params.set("business", businessData.name);
        router.replace(`/connect/manager?${params.toString()}`);
        return;
      }
    }

    if (pipelineRes.ok) {
      setPipeline(await pipelineRes.json());
    }
  }, [router]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  const refreshPipeline = useCallback(async () => {
    const res = await authenticatedFetch("/dashboard/pipeline");
    if (res.ok) setPipeline(await res.json());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshPipeline().catch(() => undefined);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshPipeline]);

  useEffect(() => {
    if (!business?.id) return;
    writeConversationMetaMap(business.id, metaByPhone);
  }, [metaByPhone, business?.id]);

  const conversations = useMemo(
    () => buildConversationSummaries(pipeline, metaByPhone),
    [pipeline, metaByPhone],
  );

  const visibleConversations = useMemo(
    () => filterConversations(conversations, { filter: activeFilter, query: deferredQuery }),
    [activeFilter, conversations, deferredQuery],
  );

  useEffect(() => {
    if (visibleConversations.length === 0) {
      setSelectedPhone(null);
      return;
    }

    if (!selectedPhone || !visibleConversations.some((item) => item.phone === selectedPhone)) {
      setSelectedPhone(visibleConversations[0].phone);
    }
  }, [selectedPhone, visibleConversations]);

  const selectedConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.phone === selectedPhone) ?? null,
    [selectedPhone, visibleConversations],
  );

  const selectedConversationId = selectedConversation?.conversationId ?? null;

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await authenticatedFetch(`/dashboard/pipeline/${conversationId}/messages`);
    return res.ok ? ((await res.json()) as PipelineMessage[]) : null;
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;
    let active = true;
    setMessages([]);
    const load = () =>
      loadMessages(selectedConversationId)
        .then((loaded) => {
          if (active && loaded) setMessages(loaded);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedConversationId, loadMessages]);

  const refreshSelected = useCallback(async () => {
    await refreshPipeline();
    if (!selectedConversationId) return;
    const loaded = await loadMessages(selectedConversationId);
    if (loaded) setMessages(loaded);
  }, [refreshPipeline, loadMessages, selectedConversationId]);

  const handleToggleBot = useCallback(async () => {
    if (!line) return;
    setTogglingBot(true);
    setBotError("");
    try {
      const answer = await runOperation<{ enabled: boolean }>(
        line.public_agent_enabled ? "disable_public_agent" : "enable_public_agent",
      );
      if (answer.status === "executed") {
        setLine({ ...line, public_agent_enabled: answer.result.enabled });
      } else if (answer.status === "approval_created") {
        setBotError("Quedó pendiente de aprobación.");
      } else {
        setBotError(answer.message);
      }
    } catch {
      setBotError("No se pudo cambiar el estado del bot.");
    } finally {
      setTogglingBot(false);
    }
  }, [line]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Seguro que quieres desconectar tu WhatsApp en Doppel?")) return;
    setDisconnecting(true);
    try {
      await runOperationOrThrow("disconnect_whatsapp_line");
      await loadDashboard();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }, [loadDashboard]);

  const updateSelectedMeta = useCallback(
    (patch: Partial<ConversationMeta>) => {
      if (!selectedConversation) return;
      setMetaByPhone((current) => {
        const existing = current[selectedConversation.phone] ?? {
          leadStatus: "new" as LeadStatus,
          notes: "",
          tags: [],
          displayName: null,
        };
        return {
          ...current,
          [selectedConversation.phone]: {
            leadStatus: patch.leadStatus ?? existing.leadStatus,
            notes: patch.notes ?? existing.notes,
            tags: patch.tags ?? existing.tags,
            displayName: patch.displayName ?? existing.displayName,
          },
        };
      });
    },
    [selectedConversation],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const phoneDisplay = line?.display_phone_number ?? "-";
  const isConnected = line !== null;
  const canReply = Boolean(line?.public_agent_enabled);
  const summaryText = getSummaryText(isConnected, conversations.length, business?.name ?? null);
  const inboundCount = messages.filter((message) => message.direction === "inbound").length;
  const outboundCount = messages.length - inboundCount;
  const pipelineWarm = getPipelineCount(conversations, ["warm", "negotiation"]);
  const pipelinePending = getPipelineCount(conversations, ["new", "contacted", "no_response"]);
  const pipelineCustomers = getPipelineCount(conversations, ["customer"]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-text-secondary">
            Automatización comercial
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Inbox de automatización</h1>
          <p className="max-w-3xl text-sm text-text-secondary">{summaryText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cx(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium",
              isConnected ? "bg-accent/12 text-accent" : "bg-white/8 text-text-secondary",
            )}
          >
            {isConnected ? `Línea activa ${phoneDisplay}` : "Sin línea conectada"}
          </span>
          <span
            className={cx(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium",
              canReply ? "bg-accent/12 text-accent" : "bg-amber-500/12 text-amber-300",
            )}
          >
            {canReply ? "Bot respondiendo" : "Bot pausado"}
          </span>
          <Button
            variant="secondary"
            onClick={() => setShowBotSettings((current) => !current)}
          >
            {showBotSettings ? "Ocultar configuración" : "Configurar bot"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DashboardNav />
        <div className="hidden lg:flex items-center gap-2 text-xs text-text-secondary">
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
            Inbox primero
          </span>
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
            Pipeline secundario
          </span>
        </div>
      </div>

      {!isConnected && <WhatsAppDisconnectedNotice />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[17.5rem_minmax(0,1.15fr)_20rem] 2xl:grid-cols-[18.5rem_minmax(0,1.25fr)_21rem]">
        <Card className="overflow-hidden p-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-7rem)]">
          <div className="border-b border-white/8 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Conversaciones</p>
                <p className="text-xs text-text-secondary">
                  {visibleConversations.length} visibles de {conversations.length}
                </p>
              </div>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contacto, teléfono o nota"
              className="mt-4 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveFilter(option.id)}
                  className={cx(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    activeFilter === option.id
                      ? "bg-accent/12 text-accent"
                      : "bg-white/5 text-text-secondary hover:text-text-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Calientes</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{pipelineWarm}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Pendientes</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{pipelinePending}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Clientes</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{pipelineCustomers}</p>
              </div>
            </div>
          </div>

          <div className="max-h-[42rem] overflow-auto p-2 xl:max-h-[calc(100vh-13rem)]">
            {visibleConversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 px-4 py-10 text-center">
                <p className="text-sm font-medium text-text-primary">Aún no hay conversaciones registradas</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Cuando lleguen mensajes nuevos, el inbox se organizará aquí por contacto.
                </p>
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => setSelectedPhone(conversation.phone)}
                  className={cx(
                    "mb-2 w-full rounded-[24px] border px-4 py-4 text-left transition",
                    selectedConversation?.phone === conversation.phone
                      ? "border-accent/30 bg-accent/8 shadow-[0_0_0_1px_rgba(37,211,102,0.16)]"
                      : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/4",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {conversation.displayName}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">{conversation.phone}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-text-secondary">
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
                    {conversation.lastMessage}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span
                      className={cx(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                        statusTone[conversation.leadStatus],
                      )}
                    >
                      {LEAD_STATUS_OPTIONS.find((item) => item.id === conversation.leadStatus)?.label}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {conversation.humanTakeover ? "Atiendes tú" : "Atiende el bot"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="min-h-[42rem] p-0 xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
          {selectedConversation ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-white/8 px-5 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-text-primary">
                        {selectedConversation.displayName}
                      </h2>
                      <span
                        className={cx(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                          statusTone[selectedConversation.leadStatus],
                        )}
                      >
                        {
                          LEAD_STATUS_OPTIONS.find(
                            (item) => item.id === selectedConversation.leadStatus,
                          )?.label
                        }
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{selectedConversation.phone}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-text-secondary xl:max-w-[19rem] xl:justify-end">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      Último inbound {formatRelativeTime(selectedConversation.lastMessageAt)}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {messages.length} mensajes
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      Línea {phoneDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-auto px-5 py-5 xl:min-h-0">
                {groupMessagesByDay(messages).map(([day, group]) => (
                  <div key={day}>
                    <div className="mb-4 flex items-center justify-center">
                      <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                        {formatThreadDate(group[0].created_at)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {group.map((message) => (
                        <div
                          key={message.id}
                          className={cx(
                            "max-w-[85%] rounded-[24px] px-4 py-3",
                            message.direction === "outbound"
                              ? "ml-auto border border-accent/20 bg-accent/8"
                              : "border border-white/8 bg-white/4",
                          )}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span
                              className={cx(
                                "text-[11px] uppercase tracking-[0.2em]",
                                message.direction === "outbound"
                                  ? "text-accent"
                                  : "text-text-secondary",
                              )}
                            >
                              {message.direction === "outbound" ? "Doppel" : "Cliente"}
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              {formatTimestamp(message.created_at)}
                            </span>
                          </div>
                          <MessageMedia message={message} />
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary">
                            {messageText(message)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <ConversationFooter
                key={selectedConversation.conversationId}
                conversation={selectedConversation}
                botEnabled={canReply}
                onChanged={refreshSelected}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[42rem] items-center justify-center px-6 text-center">
              <div className="max-w-sm">
                <p className="text-lg font-medium text-text-primary">Selecciona una conversación</p>
                <p className="mt-2 text-sm text-text-secondary">
                  El hilo completo, el contexto comercial y las próximas acciones aparecerán aquí.
                </p>
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:max-h-[calc(100vh-7rem)] xl:overflow-auto">
          <Card>
            <CardHeader title="Ficha comercial" />
            {selectedConversation ? (
              <div className="space-y-5">
                <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                    Contacto
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-xs text-text-secondary">Nombre visible</label>
                      <input
                        value={selectedConversation.displayName === selectedConversation.phone ? "" : selectedConversation.displayName}
                        onChange={(event) =>
                          updateSelectedMeta({
                            displayName: event.target.value.trim() ? event.target.value : null,
                          })
                        }
                        placeholder="Asignar nombre"
                        className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                      />
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                        Teléfono
                      </p>
                      <p className="mt-2 text-sm text-text-primary">{selectedConversation.phone}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                          Primer seen
                        </p>
                        <p className="mt-2 text-sm text-text-primary">
                          {messages[0] ? formatThreadDate(messages[0].created_at) : "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                          Último seen
                        </p>
                        <p className="mt-2 text-sm text-text-primary">
                          {formatRelativeTime(selectedConversation.lastMessageAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
                    Estado del lead
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {LEAD_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateSelectedMeta({ leadStatus: option.id })}
                        className={cx(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition",
                          selectedConversation.leadStatus === option.id
                            ? statusTone[option.id]
                            : "bg-white/5 text-text-secondary hover:text-text-primary",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-text-secondary">
                    Etiquetas
                  </label>
                  <input
                    value={selectedConversation.tags.join(", ")}
                    onChange={(event) =>
                      updateSelectedMeta({
                        tags: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="vip, mayoreo, seguimiento"
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-text-secondary">
                    Nota rápida
                  </label>
                  <textarea
                    value={selectedConversation.notes}
                    onChange={(event) => updateSelectedMeta({ notes: event.target.value })}
                    rows={5}
                    placeholder="Qué pidió, objeciones, siguiente paso..."
                    className="w-full rounded-[24px] border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Inbound</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {inboundCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Outbound</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {outboundCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Último</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">
                      {formatRelativeTime(selectedConversation.lastMessageAt)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Selecciona un chat para editar su estado comercial, notas y etiquetas.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Cuenta conectada" />
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Negocio</p>
                <p className="mt-2 font-medium text-text-primary">{business?.name ?? "-"}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">WhatsApp</p>
                <p className="mt-2 font-medium text-text-primary">{phoneDisplay}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showBotSettings && (
        <Card>
          <CardHeader
            title="Configuración del bot"
            action={
              <span className="text-xs text-text-secondary">
                {canReply
                  ? "Responde automáticamente mensajes entrantes."
                  : "Está pausado o sin línea conectada."}
              </span>
            }
          />

          <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary">Estado del bot</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {!isConnected
                    ? "Conecta tu WhatsApp para activarlo."
                    : canReply
                      ? "Está listo para responder en esta línea."
                      : "Está pausado: nadie responde a tus clientes automáticamente."}
                </p>
                {botError && <p className="mt-2 text-sm text-red-400">{botError}</p>}
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-text-primary">
                <span>{canReply ? "Activado" : "Pausado"}</span>
                <button
                  type="button"
                  aria-label={canReply ? "Pausar el bot" : "Activar el bot"}
                  onClick={handleToggleBot}
                  disabled={!isConnected || togglingBot}
                  className={cx(
                    "h-7 w-12 rounded-full transition-colors disabled:opacity-50",
                    canReply ? "bg-accent" : "bg-white/10",
                  )}
                >
                  <span
                    className={cx(
                      "block h-5 w-5 rounded-full bg-black transition-transform",
                      canReply ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </label>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Acciones de cuenta" />
        <p className="mb-5 text-sm text-text-secondary">
          La desconexión pausa el bot y desactiva la línea dentro de Doppel.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const REJECTION_TEXT: Record<string, string> = {
  CONTACT_WINDOW_CLOSED:
    "Este cliente no escribió en las últimas 24 horas. WhatsApp solo deja escribirle con una plantilla aprobada.",
  WHATSAPP_LINE_NOT_CONNECTED: "Conecta tu WhatsApp antes de responder.",
  CONTACT_NOT_FOUND: "Este cliente ya no existe.",
};

/**
 * Below a Conversation: whether the bot is paused there, and the box the Owner replies
 * with while WhatsApp still lets them write.
 */
function ConversationFooter({
  conversation,
  botEnabled,
  onChanged,
}: {
  conversation: ConversationSummary;
  botEnabled: boolean;
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState("");
  const [sendKey, setSendKey] = useState(() => crypto.randomUUID());
  const windowOpen = canReplyFreely(conversation);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const answer = await runOperation(
        "reply_to_contact",
        { contact_code: conversation.contactCode, body },
        sendKey,
      );
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? "No se pudo enviar el mensaje.");
        return;
      }
      setDraft("");
      setSendKey(crypto.randomUUID());
      await onChanged();
    } catch {
      setError("No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  async function resume() {
    setResuming(true);
    setError("");
    try {
      const answer = await runOperation("resume_public_agent", {
        contact_code: conversation.contactCode,
      });
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? "No se pudo reactivar el bot.");
        return;
      }
      await onChanged();
    } catch {
      setError("No se pudo reactivar el bot.");
    } finally {
      setResuming(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-white/8 px-5 py-4">
      {conversation.pausedUntil && botEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-200">
            Bot en pausa hasta las {formatTimestamp(conversation.pausedUntil)}
          </p>
          <Button variant="secondary" onClick={resume} disabled={resuming}>
            {resuming ? "Reactivando..." : "Reactivar bot"}
          </Button>
        </div>
      )}

      {windowOpen ? (
        <form
          className="flex items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Escribe tu respuesta. El bot se pausa 30 minutos en este chat."
            aria-label="Respuesta al cliente"
            className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
          />
          <Button type="submit" disabled={sending || !draft.trim()}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-secondary">
            {REJECTION_TEXT.CONTACT_WINDOW_CLOSED}
          </p>
          <TemplatePicker contactCode={conversation.contactCode} onSent={onChanged} />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

/** Pick an approved Template, fill its gaps and send it to a Contact whose 24 hours are over. */
function TemplatePicker({
  contactCode,
  onSent,
}: {
  contactCode: string;
  onSent: () => Promise<void>;
}) {
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [chosen, setChosen] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendKey, setSendKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    readApi<MessageTemplate[]>("/dashboard/templates")
      .then((loaded) => {
        if (active) setTemplates(loaded.filter((template) => template.status === "APPROVED"));
      })
      .catch(() => {
        if (active) setLoadError("No se pudieron cargar tus plantillas de Meta.");
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <p className="text-sm text-red-400">{loadError}</p>;
  if (templates === null) return null;
  if (templates.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No tienes plantillas aprobadas.{" "}
        <a href="/dashboard/templates" className="text-accent hover:underline">
          Crear una
        </a>
      </p>
    );
  }

  const template = templates.find((item) => item.name === chosen) ?? null;
  const gaps = template ? placeholderCount(template.body) : 0;
  const filled = Array.from({ length: gaps }, (_, index) => values[index] ?? "");
  const ready = template !== null && filled.every((value) => value.trim());

  async function send() {
    if (!template || !ready || sending) return;
    if (!confirm("Enviar esta plantilla? WhatsApp cobra cada envío.")) return;
    setSending(true);
    setError("");
    try {
      const answer = await runOperation(
        "send_template",
        {
          contact_code: contactCode,
          template_name: template.name,
          body: template.body,
          values: filled.map((value) => value.trim()),
        },
        sendKey,
      );
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? answer.message);
        return;
      }
      setChosen("");
      setValues([]);
      setSendKey(crypto.randomUUID());
      await onSent();
    } catch {
      setError("No se pudo enviar la plantilla.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <select
        aria-label="Plantilla"
        value={chosen}
        onChange={(event) => {
          setChosen(event.target.value);
          setValues([]);
        }}
        className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary outline-none focus:border-accent/40"
      >
        <option value="">Elegir plantilla</option>
        {templates.map((item) => (
          <option key={item.name} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
      {template && (
        <>
          {filled.map((value, index) => (
            <input
              key={index}
              aria-label={`Valor para {{${index + 1}}}`}
              value={value}
              onChange={(event) => {
                const next = [...filled];
                next[index] = event.target.value;
                setValues(next);
              }}
              placeholder={`Valor para {{${index + 1}}}`}
              className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent/40"
            />
          ))}
          <p className="whitespace-pre-wrap rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-text-primary">
            {renderTemplate(template.body, filled)}
          </p>
          <Button onClick={send} disabled={!ready || sending}>
            {sending ? "Enviando..." : "Enviar plantilla"}
          </Button>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

/** The file a message carries, while its link is still valid: a photo, a voice note or a link. */
function MessageMedia({ message }: { message: PipelineMessage }) {
  if (!message.media_url) return null;
  if (message.media_type === "image" || message.media_type === "sticker") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link that expires
      <img src={message.media_url} alt="" className="mt-2 max-h-64 rounded-2xl" />
    );
  }
  if (message.media_type === "audio") {
    return <audio controls src={message.media_url} className="mt-2 w-full" />;
  }
  return (
    <a href={message.media_url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-accent hover:underline">
      Abrir archivo
    </a>
  );
}
