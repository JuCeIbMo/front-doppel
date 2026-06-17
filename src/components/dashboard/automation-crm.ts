export type LeadStatus =
  | "new"
  | "contacted"
  | "warm"
  | "negotiation"
  | "customer"
  | "no_response";

export type ConversationFilter = "all" | "unread" | "warm" | "pending";

export type FlatMessage = {
  id: string;
  user_phone: string;
  direction: string;
  content: string | null;
  message_type: string;
  created_at: string;
};

export type ConversationMeta = {
  leadStatus: LeadStatus;
  notes: string;
  tags: string[];
  displayName: string | null;
};

export type ConversationSummary = {
  conversationId: string;
  phone: string;
  displayName: string;
  leadStatus: LeadStatus;
  notes: string;
  tags: string[];
  messages: FlatMessage[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  inboundCount: number;
  outboundCount: number;
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
  tenantId: string,
  messages: FlatMessage[],
  persisted: Record<string, ConversationMeta>,
): ConversationSummary[] {
  const grouped = new Map<string, FlatMessage[]>();

  for (const message of messages) {
    const thread = grouped.get(message.user_phone) ?? [];
    thread.push(message);
    grouped.set(message.user_phone, thread);
  }

  return Array.from(grouped.entries())
    .map(([phone, thread]) => {
      const sortedMessages = [...thread].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const last = sortedMessages[sortedMessages.length - 1];
      const meta = mergeConversationMeta(DEFAULT_META, persisted[phone] ?? {});

      return {
        conversationId: getConversationStorageKey(tenantId, phone),
        phone,
        displayName: meta.displayName ?? phone,
        leadStatus: meta.leadStatus,
        notes: meta.notes,
        tags: meta.tags,
        messages: sortedMessages,
        lastMessage: last.content ?? `Mensaje tipo ${last.message_type}`,
        lastMessageAt: last.created_at,
        unreadCount: 0,
        inboundCount: sortedMessages.filter((message) => message.direction === "inbound").length,
        outboundCount: sortedMessages.filter((message) => message.direction === "outbound").length,
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
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
