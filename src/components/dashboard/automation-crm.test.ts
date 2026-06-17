import { beforeEach, describe, expect, it } from "vitest";
import {
  buildConversationSummaries,
  filterConversations,
  getConversationStorageKey,
  mergeConversationMeta,
  readConversationMetaMap,
  writeConversationMetaMap,
} from "@/components/dashboard/automation-crm";

const messages = [
  {
    id: "m1",
    user_phone: "59170000001",
    direction: "inbound",
    content: "Hola, precio?",
    message_type: "text",
    created_at: "2026-06-17T10:00:00.000Z",
  },
  {
    id: "m2",
    user_phone: "59170000002",
    direction: "inbound",
    content: "Siguen atendiendo?",
    message_type: "text",
    created_at: "2026-06-17T11:00:00.000Z",
  },
  {
    id: "m3",
    user_phone: "59170000001",
    direction: "outbound",
    content: "Si, claro",
    message_type: "text",
    created_at: "2026-06-17T12:00:00.000Z",
  },
];

describe("buildConversationSummaries", () => {
  it("groups flat messages by phone and sorts by most recent activity", () => {
    const conversations = buildConversationSummaries("tenant_1", messages, {});

    expect(conversations).toHaveLength(2);
    expect(conversations[0]).toMatchObject({
      phone: "59170000001",
      lastMessage: "Si, claro",
      inboundCount: 1,
      outboundCount: 1,
    });
    expect(conversations[1]).toMatchObject({
      phone: "59170000002",
      lastMessage: "Siguen atendiendo?",
    });
  });

  it("merges persisted CRM metadata into the derived conversation", () => {
    const conversations = buildConversationSummaries("tenant_1", messages, {
      "59170000001": {
        leadStatus: "warm",
        notes: "Pidio precios",
        tags: ["vip"],
        displayName: "Andrea",
      },
    });

    expect(conversations[0]).toMatchObject({
      displayName: "Andrea",
      leadStatus: "warm",
      notes: "Pidio precios",
      tags: ["vip"],
    });
  });
});

describe("filterConversations", () => {
  it("filters by warm lead state and text query", () => {
    const base = buildConversationSummaries("tenant_1", messages, {
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
