import { beforeEach, describe, expect, it } from "vitest";
import {
  buildConversationSummaries,
  filterConversations,
  getConversationStorageKey,
  mergeConversationMeta,
  canReplyFreely,
  messageText,
  readConversationMetaMap,
  writeConversationMetaMap,
} from "@/components/dashboard/automation-crm";

const conversations = [
  {
    id: "c1",
    contact_code: "AAAAAA",
    whatsapp_number: "59170000001",
    last_message_at: "2026-06-17T12:00:00.000Z",
    last_message_body: "Si, claro",
    intervention_started_at: null,
    paused_until: null,
    reply_window_closes_at: "2026-06-18T12:00:00.000Z",
  },
  {
    id: "c2",
    contact_code: "BBBBBB",
    whatsapp_number: "59170000002",
    last_message_at: "2026-06-17T11:00:00.000Z",
    last_message_body: "Siguen atendiendo?",
    intervention_started_at: "2026-06-17T11:05:00.000Z",
    paused_until: "2026-06-17T11:35:00.000Z",
    reply_window_closes_at: null,
  },
];

describe("buildConversationSummaries", () => {
  it("lists the Pipeline's conversations by most recent activity", () => {
    const summaries = buildConversationSummaries([...conversations].reverse(), {});

    expect(summaries.map((s) => s.phone)).toEqual(["59170000001", "59170000002"]);
    expect(summaries[0]).toMatchObject({
      conversationId: "c1",
      contactCode: "AAAAAA",
      lastMessage: "Si, claro",
      humanTakeover: false,
    });
    expect(summaries[1].humanTakeover).toBe(true);
  });

  it("merges persisted CRM metadata into the conversation", () => {
    const summaries = buildConversationSummaries(conversations, {
      "59170000001": {
        leadStatus: "warm",
        notes: "Pidio precios",
        tags: ["vip"],
        displayName: "Andrea",
      },
    });

    expect(summaries[0]).toMatchObject({
      displayName: "Andrea",
      leadStatus: "warm",
      notes: "Pidio precios",
      tags: ["vip"],
    });
  });
});

describe("filterConversations", () => {
  it("filters by warm lead state and text query", () => {
    const base = buildConversationSummaries(conversations, {
      "59170000001": {
        leadStatus: "warm",
        notes: "",
        tags: [],
        displayName: "Andrea",
      },
    });

    expect(filterConversations(base, { filter: "warm", query: "" })).toHaveLength(1);
    expect(filterConversations(base, { filter: "all", query: "andre" })[0].phone).toBe(
      "59170000001",
    );
  });
});

describe("messageText", () => {
  const base = {
    id: "m",
    direction: "inbound" as const,
    body: "",
    created_at: "2026-06-17T12:00:00.000Z",
    code: "M1",
    media_type: null,
    media_url: null,
    transcript: null,
    summary: null,
    media_state: null,
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
});

describe("conversation meta helpers", () => {
  it("builds a stable storage key and merges updates safely", () => {
    expect(getConversationStorageKey("tenant_1", "59170000001")).toBe(
      "automation-crm:tenant_1:59170000001",
    );
    expect(
      mergeConversationMeta(
        { leadStatus: "new", notes: "", tags: [], displayName: null },
        { leadStatus: "customer", notes: "cerrado" },
      ),
    ).toEqual({
      leadStatus: "customer",
      notes: "cerrado",
      tags: [],
      displayName: null,
    });
  });
});

describe("local storage persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("writes and reads a tenant-scoped map", () => {
    writeConversationMetaMap("tenant_1", {
      "59170000001": {
        leadStatus: "customer",
        notes: "Cerro compra",
        tags: ["vip"],
        displayName: "Andrea",
      },
    });

    expect(readConversationMetaMap("tenant_1")).toEqual({
      "59170000001": {
        leadStatus: "customer",
        notes: "Cerro compra",
        tags: ["vip"],
        displayName: "Andrea",
      },
    });
  });
});

describe("canReplyFreely", () => {
  it("lets the Owner write only while the Contact's 24 hours are open", () => {
    const [open, silent] = buildConversationSummaries(conversations, {});

    expect(canReplyFreely(open, new Date("2026-06-18T11:59:00.000Z"))).toBe(true);
    expect(canReplyFreely(open, new Date("2026-06-18T12:01:00.000Z"))).toBe(false);
    expect(canReplyFreely(silent, new Date("2026-06-17T11:10:00.000Z"))).toBe(false);
  });
});
