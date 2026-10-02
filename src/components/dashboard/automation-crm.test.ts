import { describe, expect, it } from "vitest";
import {
  buildConversationSummaries,
  canReplyFreely,
  messageText,
} from "@/components/dashboard/automation-crm";

const conversations = [
  {
    id: "c1",
    contact_code: "AAAAAA",
    whatsapp_number: "59170000001",
    profile_name: "Andrea",
    stage: "closing" as const,
    last_message_at: "2026-06-17T12:00:00.000Z",
    last_message_body: "Si, claro",
    intervention_started_at: null,
    paused_until: null,
    reply_window_closes_at: "2026-06-18T12:00:00.000Z",
    last_call_at: null,
  },
  {
    id: "c2",
    contact_code: "BBBBBB",
    whatsapp_number: "59170000002",
    profile_name: null,
    stage: "interested" as const,
    last_message_at: "2026-06-17T11:00:00.000Z",
    last_message_body: "Siguen atendiendo?",
    intervention_started_at: "2026-06-17T11:05:00.000Z",
    paused_until: "2026-06-17T11:35:00.000Z",
    reply_window_closes_at: null,
    last_call_at: "2026-06-17T10:00:00.000Z",
  },
];

describe("buildConversationSummaries", () => {
  it("lists the Pipeline's conversations by most recent activity", () => {
    const summaries = buildConversationSummaries([...conversations].reverse());

    expect(summaries.map((s) => s.phone)).toEqual(["59170000001", "59170000002"]);
    expect(summaries[0]).toMatchObject({
      conversationId: "c1",
      contactCode: "AAAAAA",
      lastMessage: "Si, claro",
      humanTakeover: false,
    });
    expect(summaries[1].humanTakeover).toBe(true);
  });

  it("lists a Contact who only called by the time of the Call", () => {
    const summaries = buildConversationSummaries(
      [
        ...conversations,
        {
          ...conversations[0],
          id: "c3",
          whatsapp_number: "59170000003",
          last_message_at: null,
          last_message_body: null,
          last_call_at: "2026-06-17T13:00:00.000Z",
        },
      ],
      {},
    );

    expect(summaries[0]).toMatchObject({
      conversationId: "c3",
      lastMessage: "Llamada",
      lastActivityAt: "2026-06-17T13:00:00.000Z",
    });
  });

  it("names each Contact by their WhatsApp profile, else by the number, with their stage", () => {
    const [andrea, unnamed] = buildConversationSummaries(conversations);

    expect(andrea).toMatchObject({ displayName: "Andrea", stage: "closing" });
    expect(unnamed).toMatchObject({ displayName: "59170000002", stage: "interested" });
  });

  it("marks unread what happened after the Owner last read it", () => {
    const [read, unread] = buildConversationSummaries(conversations, {
      c1: "2026-06-17T12:00:00.000Z",
      c2: "2026-06-17T10:30:00.000Z",
    });
    expect(read.unread).toBe(false);
    expect(unread.unread).toBe(true);
    // Never opened in this browser: all of it is new.
    expect(buildConversationSummaries(conversations)[0].unread).toBe(true);
  });
});

describe("messageText", () => {
  const base = {
    kind: "message" as const,
    id: "m",
    direction: "inbound" as const,
    body: "",
    created_at: "2026-06-17T12:00:00.000Z",
    code: "M1",
    media_type: null,
    choice_id: null,
    media_url: null,
    transcript: null,
    summary: null,
    media_state: null,
    sent_by: null,
    shape: null,
    status: null,
  };

  it("prefers the text, then what was heard, then what was read", () => {
    expect(messageText({ ...base, body: "hola" })).toBe("hola");
    expect(messageText({ ...base, media_type: "audio", transcript: "dos poleras" })).toBe(
      "dos poleras",
    );
    expect(messageText({ ...base, media_type: "image", summary: "Yape de 45" })).toBe("Yape de 45");
    expect(messageText({ ...base, media_type: "image", media_state: "pending" })).toBe(
      "Procesando image…",
    );
  });

  it("reads only the question of a message sent with buttons", () => {
    const shape = { kind: "buttons" as const, body: "¿Cómo pagas?", buttons: [{ id: "qr", title: "QR" }] };
    expect(messageText({ ...base, body: "¿Cómo pagas? QR", shape })).toBe("¿Cómo pagas?");
  });
});

describe("canReplyFreely", () => {
  it("lets the Owner write only while the Contact's 24 hours are open", () => {
    const [open, silent] = buildConversationSummaries(conversations);

    expect(canReplyFreely(open, new Date("2026-06-18T11:59:00.000Z"))).toBe(true);
    expect(canReplyFreely(open, new Date("2026-06-18T12:01:00.000Z"))).toBe(false);
    expect(canReplyFreely(silent, new Date("2026-06-17T11:10:00.000Z"))).toBe(false);
  });
});
