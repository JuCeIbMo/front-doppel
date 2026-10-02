import type { Schema } from "@/lib/api-types";

/** Where a Contact stands, from what they did; the back works it out, the Owner does not pick it. */
export type Stage = PipelineConversation["stage"];

export const STAGE_LABEL: Record<Stage, string> = {
  interested: "Interesado",
  closing: "Por cerrar",
  customer: "Cliente",
};

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

export type ConversationSummary = {
  conversationId: string;
  contactCode: string;
  phone: string;
  /** The name on their WhatsApp profile, else the number. */
  displayName: string;
  stage: Stage;
  /** The latest message, or "Llamada" when the Contact called after it. */
  lastMessage: string;
  /** When the latest message or Call happened. */
  lastActivityAt: string | null;
  /** Something happened after the Owner last read it, in this browser. */
  unread: boolean;
  /** The bot is paused in this Conversation, because the Owner replied or it handed over. */
  humanTakeover: boolean;
  pausedUntil: string | null;
  replyWindowClosesAt: string | null;
};

/**
 * The Pipeline's Conversations, latest activity first. `seen` holds, by Conversation, when
 * the last thing the Owner read happened; anything later is unread.
 */
export function buildConversationSummaries(
  conversations: PipelineConversation[],
  seen: Record<string, string> = {},
): ConversationSummary[] {
  return conversations
    .map((conversation) => {
      const phone = conversation.whatsapp_number;
      const called = calledLast(conversation);
      const lastActivityAt = called ? conversation.last_call_at : conversation.last_message_at;
      const read = seen[conversation.id];
      return {
        conversationId: conversation.id,
        contactCode: conversation.contact_code,
        phone,
        displayName: conversation.profile_name?.trim() || phone,
        stage: conversation.stage,
        lastMessage: called ? "Llamada" : (conversation.last_message_body ?? ""),
        lastActivityAt,
        unread: lastActivityAt !== null && (!read || timeOf(lastActivityAt) > timeOf(read)),
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
  // A message with buttons, a list or products shows those apart; its text is the question.
  if (message.shape) return message.shape.body;
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
