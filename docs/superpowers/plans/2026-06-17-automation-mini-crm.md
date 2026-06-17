# Automation Mini-CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the automation dashboard into an inbox-first mini-CRM that groups messages into conversations, highlights active leads, and keeps bot configuration secondary.

**Architecture:** Extract a small, testable conversation-view-model module from the current flat messages payload, then rebuild `DashboardView` around a 3-panel inbox layout that consumes that derived model. Persist provisional CRM-only fields in `localStorage` so the UI behaves like a real product before dedicated backend endpoints exist.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library

---

## File Map

- Create: `src/components/dashboard/automation-crm.ts`
  - Derives conversations from flat message payloads
  - Applies filters and search
  - Reads/writes provisional CRM metadata to `localStorage`
- Create: `src/components/dashboard/automation-crm.test.ts`
  - Unit tests for grouping, ordering, filtering, and persistence helpers
- Modify: `src/components/dashboard/DashboardView.tsx`
  - Replace flat message log with inbox-first CRM layout
  - Demote bot settings into a secondary collapsible section
  - Add lead-state editing and conversation selection

## Task 1: Build the conversation domain helpers with TDD

**Files:**
- Create: `src/components/dashboard/automation-crm.ts`
- Test: `src/components/dashboard/automation-crm.test.ts`

- [ ] **Step 1: Write the failing tests for conversation derivation**

```ts
import { describe, expect, it } from "vitest";
import {
  buildConversationSummaries,
  filterConversations,
  getConversationStorageKey,
  mergeConversationMeta,
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
    const conversations = buildConversationSummaries(messages, {});

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
    const conversations = buildConversationSummaries(messages, {
      "tenant_1:59170000001": {
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
    const base = buildConversationSummaries(messages, {
      "tenant_1:59170000001": { leadStatus: "warm", notes: "", tags: [], displayName: "Andrea" },
    });

    expect(filterConversations(base, { filter: "warm", query: "" })).toHaveLength(1);
    expect(filterConversations(base, { filter: "all", query: "andre" })[0].phone).toBe("59170000001");
  });
});

describe("conversation meta helpers", () => {
  it("builds a stable storage key and merges updates safely", () => {
    expect(getConversationStorageKey("tenant_1", "59170000001")).toBe("automation-crm:tenant_1:59170000001");
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: FAIL because `automation-crm.ts` does not exist yet

- [ ] **Step 3: Write the minimal implementation**

```ts
export type LeadStatus = "new" | "contacted" | "warm" | "negotiation" | "customer" | "no_response";

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

export function getConversationStorageKey(tenantId: string, phone: string) {
  return `automation-crm:${tenantId}:${phone}`;
}

export function mergeConversationMeta(base: ConversationMeta, patch: Partial<ConversationMeta>): ConversationMeta {
  return {
    leadStatus: patch.leadStatus ?? base.leadStatus,
    notes: patch.notes ?? base.notes,
    tags: patch.tags ?? base.tags,
    displayName: patch.displayName ?? base.displayName,
  };
}

export function buildConversationSummaries(messages: FlatMessage[], persisted: Record<string, ConversationMeta>) {
  // group, sort, merge meta
}

export function filterConversations(/* ... */) {
  // filter by query + lead state
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: PASS

## Task 2: Add persistence helper coverage

**Files:**
- Modify: `src/components/dashboard/automation-crm.ts`
- Modify: `src/components/dashboard/automation-crm.test.ts`

- [ ] **Step 1: Write the failing persistence tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  readConversationMetaMap,
  writeConversationMetaMap,
} from "@/components/dashboard/automation-crm";

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: FAIL because persistence helpers are missing

- [ ] **Step 3: Implement the minimal persistence helpers**

```ts
const STORAGE_PREFIX = "automation-crm";

export function readConversationMetaMap(tenantId: string): Record<string, ConversationMeta> {
  if (typeof window === "undefined") return {};
  // read and parse localStorage
}

export function writeConversationMetaMap(
  tenantId: string,
  metaByPhone: Record<string, ConversationMeta>,
) {
  if (typeof window === "undefined") return;
  // serialize to localStorage
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: PASS

## Task 3: Rebuild DashboardView around the inbox-first layout

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`
- Test: `src/components/dashboard/automation-crm.test.ts`

- [ ] **Step 1: Write the failing UI test for grouped conversations**

```ts
import { render, screen } from "@testing-library/react";
import { DashboardView } from "@/components/dashboard/DashboardView";

it("renders grouped conversations instead of a flat message log", async () => {
  render(<DashboardView />);
  expect(await screen.findByText("Inbox de automatización")).toBeInTheDocument();
  expect(await screen.findByText("Andrea")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: FAIL because the current view still renders the old layout

- [ ] **Step 3: Implement the new layout in DashboardView**

Key code changes:

```tsx
const [query, setQuery] = useState("");
const [activeFilter, setActiveFilter] = useState<ConversationFilter>("all");
const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
const [showBotSettings, setShowBotSettings] = useState(false);
const [conversationMeta, setConversationMeta] = useState<Record<string, ConversationMeta>>({});

const conversations = useMemo(
  () => buildConversationSummaries(messages, conversationMetaForTenant),
  [messages, conversationMetaForTenant],
);
const visibleConversations = useMemo(
  () => filterConversations(conversations, { filter: activeFilter, query }),
  [conversations, activeFilter, query],
);
```

Render:

- compact header with bot status + WhatsApp state
- left conversation rail with search, filters, summary strip, and selected row
- center thread with message bubbles
- right contact / lead rail with editable state, notes, and tags
- collapsible bot settings card below the CRM grid

- [ ] **Step 4: Run the relevant test suite**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts src/components/ui/Card.test.tsx`

Expected: PASS

## Task 4: Finish interaction polish and responsive states

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`
- Test: `src/components/dashboard/automation-crm.test.ts`

- [ ] **Step 1: Write failing tests for filter logic and fallback rendering**

```ts
it("renders fallback copy for non-text message types", () => {
  // content null + message_type image => expect "Mensaje tipo image"
});

it("keeps the inbox visible when WhatsApp is disconnected", () => {
  // disconnected state still shows inbox scaffold
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: FAIL with missing UI behavior

- [ ] **Step 3: Implement responsive and state handling refinements**

Add:

- empty selection state in center panel
- no-conversations state
- disconnected notice above the CRM grid
- mobile stacking and rail collapse behavior
- token-consistent badge and pill styles

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts`

Expected: PASS

## Task 5: Full verification

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`
- Modify: `src/components/dashboard/automation-crm.ts`
- Modify: `src/components/dashboard/automation-crm.test.ts`

- [ ] **Step 1: Run unit tests**

Run: `npm test -- src/components/dashboard/automation-crm.test.ts src/components/ui/Card.test.tsx`

Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0

- [ ] **Step 4: Manual requirement check**

Verify in code that:

- conversations are grouped by `user_phone`
- the automation page is conversation-first
- lead status is editable
- bot configuration is secondary
- local persistence exists for temporary CRM fields
- backend follow-up is still documented in `docs/superpowers/specs/2026-06-17-automation-mini-crm-design.md`
