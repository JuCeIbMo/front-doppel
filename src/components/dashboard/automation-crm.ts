export type LeadStatus =
  | "new"
  | "contacted"
  | "warm"
  | "negotiation"
  | "customer"
  | "no_response";

export type ConversationFilter = "all" | "unread" | "warm" | "pending";

/** One Contact Conversation as `GET /dashboard/pipeline` lists it. */
export type PipelineConversation = {
  id: string;
  contact_code: string;
  whatsapp_number: string;
  last_message_at: string | null;
  last_message_body: string | null;
  intervention_started_at: string | null;
};

/** One message as `GET /dashboard/pipeline/{id}/messages` returns it. */
export type PipelineMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  code: string;
  media_type: string | null;
  media_url: string | null;
  transcript: string | null;
  summary: string | null;
  media_state: string | null;
};

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
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  /** An Owner took this Conversation over, so the agent is not answering it. */
  humanTakeover: boolean;
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
      return {
        conversationId: conversation.id,
        contactCode: conversation.contact_code,
        phone,
        displayName: meta.displayName ?? phone,
        leadStatus: meta.leadStatus,
        notes: meta.notes,
        tags: meta.tags,
        lastMessage: conversation.last_message_body ?? "",
        lastMessageAt: conversation.last_message_at,
        unreadCount: 0,
        humanTakeover: conversation.intervention_started_at !== null,
      };
    })
    .sort((a, b) => timeOf(b.lastMessageAt) - timeOf(a.lastMessageAt));
}

function timeOf(value: string | null): number {
  return value ? new Date(value).getTime() : 0;
}

/** What a message says: its text, else what was heard or read in its file. */
export function messageText(message: PipelineMessage): string {
  if (message.body) return message.body;
  if (message.transcript) return message.transcript;
  if (message.summary) return message.summary;
  if (message.media_state === "pending") return `Procesando ${message.media_type ?? "archivo"}…`;
  return message.media_type ? `Mensaje tipo ${message.media_type}` : "";
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
