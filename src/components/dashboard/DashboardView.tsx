"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authenticatedFetch } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { WhatsAppDisconnectedNotice } from "@/components/dashboard/WhatsAppDisconnectedNotice";
import {
  buildConversationSummaries,
  filterConversations,
  readConversationMetaMap,
  writeConversationMetaMap,
  type ConversationFilter,
  type ConversationMeta,
  type ConversationSummary,
  type FlatMessage,
  type LeadStatus,
} from "@/components/dashboard/automation-crm";

interface Tenant {
  id: string;
  business_name: string;
  email: string | null;
  plan: string;
  status: string;
}

interface WhatsAppAccount {
  id: string;
  waba_id: string;
  phone_number_id: string;
  display_phone: string | null;
  status: string;
}

interface BotConfig {
  id: string;
  system_prompt: string;
  welcome_message: string;
  language: string;
  bot_enabled: boolean;
}

interface MessagePage {
  messages: FlatMessage[];
  total: number;
  limit: number;
  offset: number;
}

interface AdminPhonesPayload {
  phones: string[];
}

type SaveStatus = "idle" | "saving" | "ok" | "error";

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

function formatRelativeTime(value: string) {
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

function groupMessagesByDay(messages: FlatMessage[]) {
  const groups = new Map<string, FlatMessage[]>();

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
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAccount | null>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [messages, setMessages] = useState<FlatMessage[]>([]);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [form, setForm] = useState({
    system_prompt: "",
    welcome_message: "",
    language: "es",
    bot_enabled: true,
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [disconnecting, setDisconnecting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [metaByPhone, setMetaByPhone] = useState<Record<string, ConversationMeta>>({});

  const loadDashboard = useCallback(async () => {
    const responses = await Promise.all([
      authenticatedFetch("/me/tenant"),
      authenticatedFetch("/me/whatsapp"),
      authenticatedFetch("/me/bot-config"),
      authenticatedFetch("/me/messages?limit=20&offset=0"),
      authenticatedFetch("/me/admin-phones"),
    ]);
    const [tenantRes, whatsappRes, botRes, messagesRes, adminPhonesRes] = responses;

    if (tenantRes.status === 401) {
      clearToken();
      router.replace("/connect");
      return;
    }

    if (tenantRes.status === 404) {
      router.replace("/connect");
      return;
    }

    const tenantData: Tenant = await tenantRes.json();
    const whatsappData: WhatsAppAccount[] = await whatsappRes.json();
    setTenant(tenantData);
    setMetaByPhone(readConversationMetaMap(tenantData.id));

    const account =
      whatsappData.find((entry) => entry.status === "connected") ?? whatsappData[0] ?? null;
    setWhatsapp(account);

    if (adminPhonesRes.ok && account?.status === "connected") {
      const adminPhones: AdminPhonesPayload = await adminPhonesRes.json();
      if ((adminPhones.phones || []).length === 0) {
        const params = new URLSearchParams();
        if (account.display_phone) params.set("phone", account.display_phone);
        if (tenantData.business_name) params.set("business", tenantData.business_name);
        router.replace(`/connect/manager?${params.toString()}`);
        return;
      }
    }

    if (botRes.ok) {
      const botData: BotConfig = await botRes.json();
      setBotConfig(botData);
      setForm({
        system_prompt: botData.system_prompt,
        welcome_message: botData.welcome_message,
        language: botData.language,
        bot_enabled: botData.bot_enabled,
      });
    } else {
      setBotConfig(null);
    }

    if (messagesRes.ok) {
      const page: MessagePage = await messagesRes.json();
      setMessages(page.messages);
      setMessagesTotal(page.total);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  useEffect(() => {
    if (!tenant?.id) return;
    writeConversationMetaMap(tenant.id, metaByPhone);
  }, [metaByPhone, tenant?.id]);

  const conversations = useMemo(
    () => buildConversationSummaries(tenant?.id ?? "anonymous", messages, metaByPhone),
    [messages, metaByPhone, tenant?.id],
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

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await authenticatedFetch("/me/bot-config", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated: BotConfig = await res.json();
      setBotConfig(updated);
      setForm({
        system_prompt: updated.system_prompt,
        welcome_message: updated.welcome_message,
        language: updated.language,
        bot_enabled: updated.bot_enabled,
      });
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [form]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Seguro que quieres desconectar tu WhatsApp en Doppel?")) return;
    setDisconnecting(true);
    try {
      await authenticatedFetch("/me/whatsapp", { method: "DELETE" });
      await loadDashboard();
    } finally {
      setDisconnecting(false);
    }
  }, [loadDashboard]);

  const handleDeleteAccount = useCallback(async () => {
    if (!confirm("Esta accion elimina tu cuenta, mensajes y configuracion en Doppel. Continuar?")) {
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await authenticatedFetch("/me/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      clearToken();
      router.replace("/");
    } finally {
      setDeletingAccount(false);
    }
  }, [router]);

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

  const phoneDisplay = whatsapp?.display_phone ?? whatsapp?.phone_number_id ?? "-";
  const isConnected = whatsapp?.status === "connected";
  const canReply = Boolean(form.bot_enabled && isConnected);
  const summaryText = getSummaryText(isConnected, conversations.length, tenant?.business_name ?? null);
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

      <DashboardNav />

      {!isConnected && <WhatsAppDisconnectedNotice />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-white/8 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Conversaciones</p>
                <p className="text-xs text-text-secondary">
                  {visibleConversations.length} visibles de {conversations.length}
                </p>
              </div>
              <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-text-secondary">
                {messagesTotal} mensajes
              </span>
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

          <div className="max-h-[42rem] overflow-auto p-2">
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
                      {conversation.inboundCount} in · {conversation.outboundCount} out
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="min-h-[42rem] p-0">
          {selectedConversation ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-white/8 px-5 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

                  <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      Último inbound {formatRelativeTime(selectedConversation.lastMessageAt)}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      {selectedConversation.messages.length} mensajes cargados
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">
                      Línea {phoneDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
                {groupMessagesByDay(selectedConversation.messages).map(([day, group]) => (
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
                              {message.direction === "outbound" ? "Bot" : "Cliente"}
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              {formatTimestamp(message.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary">
                            {message.content ?? `Mensaje tipo ${message.message_type}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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

        <div className="flex flex-col gap-6 lg:col-span-2 xl:col-span-1">
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/6 bg-black/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">
                          Primer seen
                        </p>
                        <p className="mt-2 text-sm text-text-primary">
                          {formatThreadDate(selectedConversation.messages[0].created_at)}
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Inbound</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {selectedConversation.inboundCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Outbound</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {selectedConversation.outboundCount}
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
                <p className="mt-2 font-medium text-text-primary">{tenant?.business_name ?? "-"}</p>
                <p className="mt-1 text-text-secondary">
                  Plan {tenant?.plan ?? "free"} · Estado {tenant?.status ?? "active"}
                </p>
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

          {botConfig === null ? (
            <p className="text-sm text-text-secondary">
              Sin configuración disponible. Reconecta tu cuenta para inicializarla.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Estado del bot</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {canReply
                          ? "Está listo para responder en esta línea."
                          : "Está pausado o esperando reconexión."}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm text-text-primary">
                      <span>{form.bot_enabled ? "Activado" : "Pausado"}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({ ...current, bot_enabled: !current.bot_enabled }))
                        }
                        className={cx(
                          "h-7 w-12 rounded-full transition-colors",
                          form.bot_enabled ? "bg-accent" : "bg-white/10",
                        )}
                      >
                        <span
                          className={cx(
                            "block h-5 w-5 rounded-full bg-black transition-transform",
                            form.bot_enabled ? "translate-x-6" : "translate-x-1",
                          )}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-text-secondary">Idioma</label>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, language: event.target.value }))
                    }
                    maxLength={10}
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-text-secondary">Mensaje de bienvenida</label>
                  <input
                    type="text"
                    value={form.welcome_message}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, welcome_message: event.target.value }))
                    }
                    maxLength={500}
                    placeholder="Hola, en qué puedo ayudarte?"
                    className="w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-text-secondary">Instrucciones del bot</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, system_prompt: event.target.value }))
                  }
                  maxLength={4000}
                  rows={10}
                  placeholder="Eres un asistente de atención al cliente para..."
                  className="w-full rounded-[24px] border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                />
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-xs text-text-secondary">{form.system_prompt.length}/4000</p>
                  <div className="flex items-center gap-4">
                    {saveStatus === "ok" && <span className="text-sm text-accent">Guardado</span>}
                    {saveStatus === "error" && (
                      <span className="text-sm text-red-400">Error al guardar</span>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saveStatus === "saving"}
                    >
                      {saveStatus === "saving" ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Acciones de cuenta" />
        <p className="mb-5 text-sm text-text-secondary">
          La desconexión pausa el bot y desactiva la línea dentro de Doppel. La eliminación borra
          los datos almacenados en esta plataforma.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? "Desconectando..." : "Desconectar WhatsApp"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="text-red-400 hover:text-red-300"
          >
            {deletingAccount ? "Eliminando cuenta..." : "Eliminar cuenta y datos"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
