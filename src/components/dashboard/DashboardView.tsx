"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { ArrowLeft, PhoneCall, Search, SendHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useApprovedTemplates,
  useConversationThread,
  useInbox,
  useResumeBot,
  useSendToContact,
} from "@/lib/pipeline";
import { placeholderCount, renderTemplate } from "@/lib/templates";
import { BUSINESS_TIME_ZONE } from "@/lib/appointments";
import { formatPhone } from "@/lib/phone";
import { WhatsAppDisconnectedNotice } from "@/components/dashboard/WhatsAppDisconnectedNotice";
import { ContactAppointments } from "@/components/dashboard/ContactAppointments";
import {
  buildConversationSummaries,
  canReplyFreely,
  callDuration,
  messageText,
  missedReasonText,
  type ConversationSummary,
  type PipelineCall,
  type PipelineItem,
  type PipelineMessage,
} from "@/components/dashboard/automation-crm";

type Filter = "all" | "you";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const dayKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(new Date(value));

/** When something last happened, as the list says it: "14:32" today, "ayer", or "12 sep". */
export function listTime(value: string | null, now: Date = new Date()): string {
  if (!value) return "";
  const day = dayKey(value);
  if (day === dayKey(now)) return formatTimestamp(value);
  if (day === dayKey(new Date(now.getTime() - 86400000))) return "ayer";
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "numeric",
    month: "short",
  })
    .format(new Date(value))
    .replace(".", "");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function writtenDay(value: string) {
  const text = new Intl.DateTimeFormat("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The pill between days, as WhatsApp says it: "Hoy", "Ayer" or the written day. */
function chatDay(value: string, now: Date = new Date()) {
  const day = dayKey(value);
  if (day === dayKey(now)) return "Hoy";
  if (day === dayKey(new Date(now.getTime() - 86400000))) return "Ayer";
  return writtenDay(value);
}

function groupByDay(thread: PipelineItem[]) {
  const groups = new Map<string, PipelineItem[]>();
  for (const item of thread) {
    const key = dayKey(item.created_at);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries());
}

/**
 * Conversaciones: who is talking with the Business, the ones that need the Owner first,
 * and the thread of the one chosen. On a computer the list and the thread sit side by
 * side; on a phone the thread opens over the list, with a way back.
 */
export function DashboardView() {
  const { line, conversations: pipelineData, refetchConversations, loading, loadError } =
    useInbox();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);

  const conversations = useMemo(() => {
    const all = buildConversationSummaries(pipelineData ?? [], {});
    // The ones the Owner is attending come first, then by latest activity.
    return [...all.filter((item) => item.humanTakeover), ...all.filter((item) => !item.humanTakeover)];
  }, [pipelineData]);
  const yours = conversations.filter((item) => item.humanTakeover).length;

  const visible = useMemo(() => {
    const text = deferredQuery.trim().toLowerCase();
    const digits = text.replace(/\D/g, "");
    return conversations.filter((item) => {
      if (filter === "you" && !item.humanTakeover) return false;
      if (!text) return true;
      return (
        item.displayName.toLowerCase().includes(text) ||
        item.contactCode.toLowerCase().includes(text) ||
        (digits !== "" && item.phone.includes(digits))
      );
    });
  }, [conversations, filter, deferredQuery]);

  const selected =
    visible.find((item) => item.conversationId === selectedId) ?? visible[0] ?? null;
  const threadQuery = useConversationThread(selected?.conversationId ?? null);
  const refetchThread = threadQuery.refetch;
  const refreshSelected = useCallback(async () => {
    await refetchConversations();
    await refetchThread();
  }, [refetchConversations, refetchThread]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando conversaciones">
        <div className="h-8 w-56 animate-pulse bg-paper-rule/50" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-16 animate-pulse bg-paper-rule/30" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <h1>Conversaciones</h1>
        <p className="font-hand text-lg font-bold text-danger">{loadError}</p>
        <Button variant="secondary" className="self-start" onClick={() => void refetchConversations()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const isConnected = line !== null;
  const botOn = Boolean(line?.public_agent_enabled);

  const list = (
    <section
      aria-label="Lista de conversaciones"
      className={cx(
        "flex min-h-0 flex-col lg:border-r lg:border-paper-rule lg:pr-0",
        threadOpen && "max-lg:hidden",
      )}
    >
      <div className="flex flex-col gap-3 pb-3 lg:pr-4">
        <div role="tablist" aria-label="Filtrar" className="flex gap-2">
          {(
            [
              { id: "all", label: "Todas", count: conversations.length },
              { id: "you", label: "Te necesitan", count: yours },
            ] as const
          ).map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(option.id)}
                className={cx(
                  "flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors",
                  active ? "bg-ink text-paper" : "bg-ink/[0.07] text-ink hover:bg-ink/[0.12]",
                )}
              >
                {option.label}
                <span
                  className={cx(
                    "min-w-5 rounded-full px-1.5 font-display text-xs font-black tabular-nums",
                    option.id === "you" && option.count > 0 && "bg-waiting text-paper",
                  )}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative block">
          <span className="sr-only">Buscar por nombre, número o código</span>
          <Search
            aria-hidden
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nombre o número"
            className="min-h-11 w-full rounded-full border border-transparent bg-ink/[0.07] pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-muted/80 outline-none focus:border-ink/40 focus:bg-paper"
          />
        </label>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto lg:pr-0">
        {visible.length === 0 ? (
          <li className="px-1 py-10 text-[15px] text-ink-muted">
            {conversations.length === 0
              ? isConnected
                ? "Todavía nadie le escribió a tu negocio. Cuando alguien lo haga, aparece aquí."
                : "Conecta tu WhatsApp para empezar a recibir mensajes."
              : filter === "you" && !query
                ? "Ninguna conversación te necesita. El bot se encarga."
                : "Nada coincide con tu búsqueda."}
          </li>
        ) : (
          visible.map((conversation) => (
            <ConversationRow
              key={conversation.conversationId}
              conversation={conversation}
              active={selected?.conversationId === conversation.conversationId}
              onOpen={() => {
                setSelectedId(conversation.conversationId);
                setThreadOpen(true);
              }}
            />
          ))
        )}
      </ul>
    </section>
  );

  return (
    <div className="flex flex-col gap-5 lg:h-[calc(100vh-4rem)]">
      <header className={cx("flex flex-wrap items-end justify-between gap-3", threadOpen && "max-lg:hidden")}>
        <div>
          <h1>Conversaciones</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <span
              aria-hidden
              className={cx("h-2.5 w-2.5", botOn ? "bg-settled" : "bg-waiting")}
            />
            {!isConnected
              ? "Sin WhatsApp conectado"
              : botOn
                ? `El bot responde en ${line?.display_phone_number}`
                : "El bot está apagado: nadie responde a tus clientes"}
            {isConnected && !botOn && (
              <Link href="/dashboard/knowledge" className="font-bold text-ink underline underline-offset-4">
                Encenderlo
              </Link>
            )}
          </p>
        </div>
      </header>

      {!isConnected && <WhatsAppDisconnectedNotice />}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {list}
        <section
          aria-label="Conversación"
          className={cx("flex min-h-0 flex-col lg:pl-4", !threadOpen && "max-lg:hidden")}
        >
          {selected ? (
            <Thread
              key={selected.conversationId}
              conversation={selected}
              thread={threadQuery.data ?? []}
              loadingThread={threadQuery.isLoading}
              botEnabled={botOn}
              onBack={() => setThreadOpen(false)}
              onChanged={refreshSelected}
            />
          ) : (
            <p className="hidden py-16 text-center text-[15px] text-ink-muted lg:block">
              Elige una conversación para leerla.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onOpen,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: () => void;
}) {
  const called = conversation.lastMessage === "Llamada";
  const name =
    conversation.displayName === conversation.phone
      ? formatPhone(conversation.phone)
      : conversation.displayName;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cx(
          "flex w-full items-center gap-3 px-2 text-left transition-colors",
          active
            ? "lg:bg-ink/[0.07]"
            : conversation.humanTakeover
              ? "bg-waiting/[0.06] hover:bg-waiting/[0.1]"
              : "hover:bg-ink/[0.04]",
        )}
      >
        <Avatar conversation={conversation} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-paper-rule py-3">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-base font-bold">{name}</span>
            <span
              className={cx(
                "shrink-0 text-xs tabular-nums",
                conversation.humanTakeover ? "font-extrabold text-waiting" : "text-ink-muted",
              )}
            >
              {listTime(conversation.lastActivityAt)}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink-muted">
              {called && <PhoneCall aria-hidden size={13} className="shrink-0" />}
              <span className="truncate">{conversation.lastMessage || "Sin mensajes"}</span>
            </span>
            {conversation.humanTakeover && (
              <span className="shrink-0 rounded-full bg-waiting px-2 py-px text-[11px] font-bold text-paper">
                Atiendes tú
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

const AVATAR_COLORS = ["bg-waiting", "bg-settled", "bg-steps", "bg-month", "bg-ink"];

/** A round mark for a Contact, as WhatsApp shows one: their initials, or a person if only the number is known. */
function Avatar({ conversation, small = false }: { conversation: ConversationSummary; small?: boolean }) {
  const named = conversation.displayName !== conversation.phone;
  const initials = conversation.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const color =
    AVATAR_COLORS[
      [...conversation.contactCode].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        AVATAR_COLORS.length
    ];
  return (
    <span
      aria-hidden
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-display font-black text-paper",
        small ? "h-10 w-10 text-sm" : "h-12 w-12 text-base",
        color,
      )}
    >
      {named && initials ? initials : <User size={small ? 18 : 22} />}
    </span>
  );
}

function Thread({
  conversation,
  thread,
  loadingThread,
  botEnabled,
  onBack,
  onChanged,
}: {
  conversation: ConversationSummary;
  thread: PipelineItem[];
  loadingThread: boolean;
  botEnabled: boolean;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const name =
    conversation.displayName === conversation.phone
      ? formatPhone(conversation.phone)
      : conversation.displayName;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-xl">
      <div className="flex items-center gap-3 bg-ink px-3 py-2.5 text-paper">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a la lista"
          className="-ml-1 flex h-11 w-9 items-center justify-center lg:hidden"
        >
          <ArrowLeft size={22} />
        </button>
        <Avatar conversation={conversation} small />
        <div className="min-w-0">
          <h2 className="truncate font-body text-base font-bold leading-tight">{name}</h2>
          <p className="truncate text-xs text-paper/75">
            {name === formatPhone(conversation.phone)
              ? conversation.contactCode
              : `${formatPhone(conversation.phone)} · ${conversation.contactCode}`}
            {conversation.humanTakeover && " · atiendes tú"}
          </p>
        </div>
      </div>

      <div className="chat-wall min-h-[40vh] flex-1 overflow-y-auto px-3 py-3 lg:min-h-0 lg:px-6">
        {loadingThread ? (
          <div className="flex flex-col gap-3">
            <div className="h-14 w-2/3 animate-pulse rounded-lg bg-paper/70" />
            <div className="ml-auto h-14 w-2/3 animate-pulse rounded-lg bg-paper/70" />
          </div>
        ) : thread.length === 0 ? (
          <p className="mx-auto mt-10 w-fit rounded-lg bg-paper px-3 py-1.5 text-sm text-ink-muted">
            Todavía no hay mensajes.
          </p>
        ) : (
          groupByDay(thread).map(([day, group]) => (
            <div key={day} className="mb-3">
              <p className="mx-auto mb-2 w-fit rounded-lg bg-paper px-3 py-1 text-xs font-bold text-ink-muted shadow-[0_1px_0_rgba(35,26,22,0.08)]">
                {chatDay(group[0].created_at)}
              </p>
              <div className="flex flex-col gap-1">
                {group.map((item, index) => {
                  if (item.kind === "call") return <CallEntry key={item.id} call={item} />;
                  const previous = group[index - 1];
                  // Like WhatsApp: only the first of a run from the same side gets the tail.
                  const first =
                    !previous || previous.kind === "call" || previous.direction !== item.direction;
                  return <MessageBubble key={item.id} message={item} first={first} />;
                })}
              </div>
            </div>
          ))
        )}
        <div className="mt-2">
          <ContactAppointments conversationId={conversation.conversationId} />
        </div>
      </div>

      <ConversationFooter conversation={conversation} botEnabled={botEnabled} onChanged={onChanged} />
    </div>
  );
}

function MessageBubble({ message, first }: { message: PipelineMessage; first: boolean }) {
  const fromBusiness = message.direction === "outbound";
  return (
    <div
      className={cx(
        "relative max-w-[85%] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-[0_1px_0_rgba(35,26,22,0.1)] lg:max-w-[70%]",
        fromBusiness ? "ml-auto bg-[#DCEFE3]" : "mr-auto bg-white",
        first && "mt-1.5",
        first && (fromBusiness ? "bubble-tail-out rounded-tr-none" : "bubble-tail-in rounded-tl-none"),
      )}
    >
      <MessageMedia message={message} />
      <p className="whitespace-pre-wrap text-[15px] leading-snug">
        {messageText(message)}
        <span className="float-right ml-3 mt-1.5 text-[11px] leading-none text-ink-muted tabular-nums">
          {formatTimestamp(message.created_at)}
        </span>
      </p>
    </div>
  );
}

const REJECTION_TEXT: Record<string, string> = {
  CONTACT_WINDOW_CLOSED:
    "Pasaron 24 horas desde su último mensaje. Solo puedes escribirle con una plantilla aprobada.",
  WHATSAPP_LINE_NOT_CONNECTED: "Conecta tu WhatsApp antes de responder.",
  CONTACT_NOT_FOUND: "Este cliente ya no existe.",
};

/**
 * Below a Conversation: whether the Owner is attending it, and the box they reply with
 * while WhatsApp still lets them write; after 24 hours, only an approved template.
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
  const [error, setError] = useState("");
  const reply = useSendToContact("reply_to_contact", async () => {
    setDraft("");
    await onChanged();
  });
  const resumeBot = useResumeBot(onChanged);
  const sending = reply.isPending;
  const resuming = resumeBot.isPending;
  const windowOpen = canReplyFreely(conversation);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setError("");
    try {
      const answer = await reply.mutateAsync({ contact_code: conversation.contactCode, body });
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? "No se pudo enviar el mensaje.");
      }
    } catch {
      setError("No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function resume() {
    setError("");
    try {
      const answer = await resumeBot.mutateAsync(conversation.contactCode);
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? "No se pudo devolver al bot.");
      }
    } catch {
      setError("No se pudo devolver al bot.");
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-paper-grid/60 px-3 pb-3 pt-2 lg:px-4">
      {conversation.pausedUntil && botEnabled && (
        <div className="-mx-3 -mt-2 flex flex-wrap items-center justify-between gap-3 bg-waiting px-4 py-2.5 text-paper lg:-mx-4">
          <p className="text-sm font-bold">
            Atiendes tú. El bot vuelve a las {formatTimestamp(conversation.pausedUntil)}.
          </p>
          <button
            type="button"
            onClick={resume}
            disabled={resuming}
            className="min-h-10 rounded-full border-2 border-paper px-4 text-sm font-bold transition-colors hover:bg-paper hover:text-waiting disabled:opacity-60"
          >
            {resuming ? "Devolviendo…" : "Devolver al bot"}
          </button>
        </div>
      )}

      {windowOpen ? (
        <form
          className="flex items-end gap-2"
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
            rows={1}
            placeholder="Escribe un mensaje"
            aria-label="Respuesta al cliente"
            aria-describedby="reply-pauses-bot"
            className="max-h-36 min-h-12 w-full flex-1 resize-none rounded-3xl bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/80 outline-none [field-sizing:content] focus:ring-2 focus:ring-ink/20"
          />
          <button
            type="submit"
            aria-label={sending ? "Enviando…" : "Enviar"}
            disabled={sending || !draft.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-settled text-paper transition-opacity disabled:opacity-50"
          >
            <SendHorizontal size={20} />
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-ink-muted">{REJECTION_TEXT.CONTACT_WINDOW_CLOSED}</p>
          <TemplatePicker contactCode={conversation.contactCode} onSent={onChanged} />
        </div>
      )}
      {windowOpen && (
        <p id="reply-pauses-bot" className="px-2 text-xs text-ink-muted">
          Al responder, el bot se pausa 30 minutos en este chat.
        </p>
      )}

      {error && (
        <p role="alert" className="font-hand text-base font-bold text-danger">
          {error}
        </p>
      )}
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
  const { templates, loadError } = useApprovedTemplates();
  const [chosen, setChosen] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState("");
  const sendTemplate = useSendToContact("send_template", async () => {
    setChosen("");
    setValues([]);
    await onSent();
  });
  const sending = sendTemplate.isPending;

  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;
  if (templates === null) return null;
  if (templates.length === 0) {
    return (
      <p className="text-[15px]">
        No tienes plantillas aprobadas.{" "}
        <Link href="/dashboard/templates" className="font-bold underline underline-offset-4">
          Crear una
        </Link>
      </p>
    );
  }

  const template = templates.find((item) => item.name === chosen) ?? null;
  const gaps = template ? placeholderCount(template.body) : 0;
  const filled = Array.from({ length: gaps }, (_, index) => values[index] ?? "");
  const ready = template !== null && filled.every((value) => value.trim());
  const field =
    "min-h-11 w-full border border-ink/35 bg-paper px-3 text-[15px] text-ink placeholder:text-ink-muted/80 outline-none focus:border-ink";

  async function send() {
    if (!template || !ready || sending) return;
    if (!confirm("¿Enviar esta plantilla? WhatsApp cobra cada envío.")) return;
    setError("");
    try {
      const answer = await sendTemplate.mutateAsync({
        contact_code: contactCode,
        template_name: template.name,
        body: template.body,
        values: filled.map((value) => value.trim()),
      });
      if (answer.status === "rejected") {
        setError(REJECTION_TEXT[answer.code] ?? answer.message);
      }
    } catch {
      setError("No se pudo enviar la plantilla.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        aria-label="Plantilla"
        value={chosen}
        onChange={(event) => {
          setChosen(event.target.value);
          setValues([]);
        }}
        className={field}
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
              className={field}
            />
          ))}
          <p className="whitespace-pre-wrap bg-ink/[0.07] px-3.5 py-2.5 text-[15px]">
            {renderTemplate(template.body, filled)}
          </p>
          <Button onClick={send} disabled={!ready || sending} className="self-start">
            {sending ? "Enviando…" : "Enviar plantilla"}
          </Button>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

/** The file a message carries, while its link is still valid: a photo, a voice note or a link. */
function MessageMedia({ message }: { message: PipelineMessage }) {
  if (!message.media_url) return null;
  if (message.media_type === "image" || message.media_type === "sticker") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link that expires
      <img src={message.media_url} alt="" loading="lazy" className="mt-2 max-h-64" />
    );
  }
  if (message.media_type === "audio") {
    return <audio controls src={message.media_url} className="mt-2 w-full" />;
  }
  return (
    <a
      href={message.media_url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block text-sm font-bold underline underline-offset-4"
    >
      Abrir archivo
    </a>
  );
}

/** A Call in the thread: answered with its duration and a transcript to open, or missed and why. */
function CallEntry({ call }: { call: PipelineCall }) {
  const [open, setOpen] = useState(false);
  const title =
    call.outcome === "answered"
      ? `Llamada atendida${call.duration_seconds !== null ? ` · ${callDuration(call.duration_seconds)}` : ""}`
      : call.outcome === "missed"
        ? "Llamada perdida"
        : "Llamada en curso";
  return (
    <div className="mx-auto my-1.5 w-full max-w-[85%] rounded-lg bg-paper px-3.5 py-2 shadow-[0_1px_0_rgba(35,26,22,0.08)] lg:max-w-[70%]">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-sm font-bold">
          <PhoneCall aria-hidden size={15} />
          {title}
        </span>
        <span className="text-[11px] text-ink-muted tabular-nums">{formatTimestamp(call.created_at)}</span>
      </div>
      {call.outcome === "missed" && (
        <p className="mt-1 text-[15px]">{missedReasonText(call.missed_reason)}</p>
      )}
      {call.transcript.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="mt-1 min-h-9 text-sm font-bold underline underline-offset-4"
          >
            {open ? "Ocultar transcripción" : "Ver transcripción"}
          </button>
          {open && (
            <div className="mt-1 flex flex-col gap-1">
              {call.transcript.map((line, index) => (
                <p key={index} className="whitespace-pre-wrap text-[15px] leading-6">
                  <span className="font-bold text-ink-muted">
                    {line.who === "contact" ? "Cliente" : "Bot"}:
                  </span>{" "}
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
