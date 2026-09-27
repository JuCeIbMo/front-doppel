import type { Schema } from "@/lib/api-types";

export type LeadStatus =
  | "new"
  | "contacted"
  | "warm"
  | "negotiation"
  | "customer"
  | "no_response";

export type ConversationFilter = "all" | "unread" | "warm" | "pending";

/**
 * One Contact Conversation as `GET /dashboard/pipeline` lists it. `paused_until` is when
 * the bot answers again; past `reply_window_closes_at` only a template gets through.
 */
export type PipelineConversation = Schema<"ConversationSummary">;

/** One message as `GET /dashboard/pipeline/{id}/messages` returns it. */
export type PipelineMessage = Schema<"PipelineMessage">;

export type MissedReason = Schema<"MissedReason">;

/**
 * One Call as `GET /dashboard/pipeline/{id}/messages` returns it, between the messages.
 * `outcome` is null while the Call is still being answered.
 */
export type PipelineCall = Schema<"PipelineCall">;

export type PipelineItem = PipelineMessage | PipelineCall;

export type ConversationMeta = {
  leadStatus: LeadStatus;
  notes: string;
  tags: string[];
  displayName: string | null;
};

export type ConversationSummary = {
  conversationId: string;
  contactCode: string;
  phone: string;
  displayName: string;
  leadStatus: LeadStatus;
  notes: string;
  tags: string[];
  /** The latest message, or "Llamada" when the Contact called after it. */
  lastMessage: string;
  /** When the latest message or Call happened. */
  lastActivityAt: string | null;
  unreadCount: number;
  /** The bot is paused in this Conversation, because the Owner replied or it handed over. */
  humanTakeover: boolean;
  pausedUntil: string | null;
  replyWindowClosesAt: string | null;
};

const STORAGE_PREFIX = "automation-crm";

const DEFAULT_META: ConversationMeta = {
  leadStatus: "new",
  notes: "",
  tags: [],
  displayName: null,
};

export function getConversationStorageKey(tenantId: string, phone: string) {
  return `${STORAGE_PREFIX}:${tenantId}:${phone}`;
}

export function mergeConversationMeta(
  base: ConversationMeta,
  patch: Partial<ConversationMeta>,
): ConversationMeta {
  return {
    leadStatus: patch.leadStatus ?? base.leadStatus,
    notes: patch.notes ?? base.notes,
    tags: patch.tags ?? base.tags,
    displayName: patch.displayName ?? base.displayName,
  };
}

export function readConversationMetaMap(
  tenantId: string,
): Record<string, ConversationMeta> {
  if (typeof window === "undefined") return {};

  const result: Record<string, ConversationMeta> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(`${STORAGE_PREFIX}:${tenantId}:`)) continue;
    const phone = key.slice(`${STORAGE_PREFIX}:${tenantId}:`.length);
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<ConversationMeta>;
      result[phone] = mergeConversationMeta(DEFAULT_META, parsed);
    } catch {
      continue;
    }
  }
  return result;
}

export function writeConversationMetaMap(
  tenantId: string,
  metaByPhone: Record<string, ConversationMeta>,
) {
  if (typeof window === "undefined") return;

  for (const [phone, meta] of Object.entries(metaByPhone)) {
    window.localStorage.setItem(getConversationStorageKey(tenantId, phone), JSON.stringify(meta));
  }
}

export function buildConversationSummaries(
  conversations: PipelineConversation[],
  persisted: Record<string, ConversationMeta>,
): ConversationSummary[] {
  return conversations
    .map((conversation) => {
      const phone = conversation.whatsapp_number;
      const meta = mergeConversationMeta(DEFAULT_META, persisted[phone] ?? {});
      const called = calledLast(conversation);
      return {
        conversationId: conversation.id,
        contactCode: conversation.contact_code,
        phone,
        displayName: meta.displayName ?? phone,
        leadStatus: meta.leadStatus,
        notes: meta.notes,
        tags: meta.tags,
        lastMessage: called ? "Llamada" : (conversation.last_message_body ?? ""),
        lastActivityAt: called ? conversation.last_call_at : conversation.last_message_at,
        unreadCount: 0,
        humanTakeover: conversation.paused_until !== null,
        pausedUntil: conversation.paused_until,
        replyWindowClosesAt: conversation.reply_window_closes_at,
      };
    })
    .sort((a, b) => timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt));
}

function calledLast(conversation: PipelineConversation): boolean {
  return timeOf(conversation.last_call_at) > timeOf(conversation.last_message_at);
}

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

/** Whether WhatsApp still lets the Owner write to this Contact without a template. */
export function canReplyFreely(conversation: ConversationSummary, now: Date = new Date()): boolean {
  if (!conversation.replyWindowClosesAt) return false;
  return new Date(conversation.replyWindowClosesAt).getTime() > now.getTime();
}

/** What a message says: its text, else what was heard or read in its file. */
export function messageText(message: PipelineMessage): string {
  if (message.body) return message.body;
  if (message.transcript) return message.transcript;
  if (message.summary) return message.summary;
  if (message.media_state === "pending") return `Procesando ${message.media_type ?? "archivo"}…`;
  return message.media_type ? `Mensaje tipo ${message.media_type}` : "";
}

const MISSED_REASON_TEXT: Record<MissedReason, string> = {
  manager_phone: "Llamó desde un teléfono de encargado.",
  calls_disabled: "Las llamadas estaban apagadas.",
  public_agent_disabled: "El bot estaba apagado.",
  intervention: "La conversación estaba en tus manos, así que el bot no contestó.",
  allowance_spent: "Se acabaron los minutos de llamada del mes. Se invitó al cliente a escribir.",
  no_capacity: "El servicio de voz estaba ocupado. Se invitó al cliente a escribir.",
  voice_model_unavailable: "La voz del bot no se pudo conectar. Se invitó al cliente a escribir.",
  connection_failed: "La llamada no se pudo conectar. Se invitó al cliente a escribir.",
};

/** Why a missed Call was not answered, in words the Owner understands. */
export function missedReasonText(reason: MissedReason | null): string {
  return reason ? MISSED_REASON_TEXT[reason] : "";
}

/** "1 min 35 s", as Meta timed the Call. */
export function callDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

export function filterConversations(
  conversations: ConversationSummary[],
  options: { filter: ConversationFilter; query: string },
) {
  const query = options.query.trim().toLowerCase();

  return conversations.filter((conversation) => {
    if (options.filter === "warm" && !["warm", "negotiation"].includes(conversation.leadStatus)) {
      return false;
    }

    if (
      options.filter === "pending" &&
      !["new", "contacted", "no_response"].includes(conversation.leadStatus)
    ) {
      return false;
    }

    if (options.filter === "unread" && conversation.unreadCount <= 0) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      conversation.displayName,
      conversation.phone,
      conversation.lastMessage,
      conversation.notes,
      conversation.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
