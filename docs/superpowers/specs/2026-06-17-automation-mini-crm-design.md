# Automation Mini-CRM — Design Spec

**Date:** 2026-06-17  
**Scope:** Redesign `src/components/dashboard/DashboardView.tsx` into an inbox-first mini-CRM for WhatsApp automation  
**Out of scope:** Full pipeline board, outbound sending, multi-agent observability, backend implementation

## 1. Goal

Give the automation area much more product weight by turning it from a settings page with a flat message list into an operational mini-CRM focused on:

- Reading conversations quickly
- Prioritizing active chats
- Giving each conversation a lightweight commercial context
- Keeping lead status visible but secondary to the inbox

The result should feel like a real work surface, not a configuration form with a log attached.

## 2. Current State

Today `DashboardView` mixes three unrelated concerns in one two-column layout:

- Tenant / WhatsApp account info
- Bot configuration form
- Flat list of the last 20 messages

This creates three problems:

- Conversations have low visual priority even though they are the main operational asset
- Messages are shown as isolated records instead of grouped conversations
- There is no contact-level or lead-level context around a chat

## 3. Product Direction

### Recommended approach: Inbox-first mini-CRM

The screen becomes a 3-panel inbox:

- **Left rail:** conversation index
- **Center panel:** active conversation thread
- **Right rail:** contact and lead context

The pipeline exists, but only as:

- lead-status chips
- filters
- summary counts

This keeps the core experience centered on reading and handling conversations while still signaling commercial progression.

### Rejected alternatives

- **Flat-list upgrade:** too small a change, still feels like a log
- **Full kanban-first CRM:** overweights the pipeline and depends on backend data the product does not have yet

## 4. Interface Direction

**Intent:** A business owner or operator opens this screen to understand who wrote, what needs attention, and which chats look commercially relevant.

**Feel:** Dense, calm, operational, credible. More support desk than marketing dashboard.

**Domain:**

- WhatsApp inbox
- sales follow-up
- unread conversations
- warm leads
- customer context
- response timing
- conversation health

**Color world:**

- charcoal canvas
- graphite panels
- muted zinc metadata
- WhatsApp green for action and live states
- amber for waiting / warm lead states
- soft red only for risk or disconnection

**Signature:**

The signature element is the **conversation roster with commercial pulse**: every row shows the contact, last message, last activity, unread state, and lightweight lead status in a compact operator-friendly format.

**Replacing defaults:**

- Default `settings form first` -> `conversation inbox first`
- Default `flat message cards` -> `threaded grouped conversations`
- Default `pipeline board as main CRM metaphor` -> `pipeline as metadata and filters`

## 5. Information Architecture

### 5.1 Top header

Replace the current generic page intro with a compact operational header:

- Title: `Inbox de automatización`
- Subtitle: one-line status summary tied to connection state and conversation volume
- Right-side compact actions:
  - bot on/off state
  - `Configurar bot` toggle or button to open settings drawer/card
  - connected WhatsApp badge

Bot configuration should no longer occupy the main viewport by default.

### 5.2 Primary layout

Desktop:

- `280px` left conversation rail
- flexible center thread panel
- `320px` right context rail

Tablet:

- left rail + center panel
- context rail collapses below thread

Mobile:

- stacked flow
- conversation list first
- active thread opens in its own panel
- contact context below thread

### 5.3 Left rail: Conversation inbox

Purpose: scan chats and choose where to focus.

Contents:

- search input
- filters row
  - `Todos`
  - `Sin leer`
  - `Calientes`
  - `Pendientes`
- small pipeline summary strip with counts by lead status
- scrollable conversation list

Each conversation row includes:

- contact name if known, otherwise formatted phone
- phone secondary line
- last message preview
- relative timestamp
- unread count badge if applicable
- lead-status chip
- visual emphasis when selected

Sorting:

- most recent activity first
- unread conversations get stronger emphasis

### 5.4 Center panel: Active thread

Purpose: understand the full exchange, not just isolated records.

Contents:

- thread header with contact identity and current status
- compact summary line:
  - last inbound time
  - total messages in loaded thread
  - connected line / WhatsApp label
- chronological message bubbles grouped by date
- inbound vs outbound styling
- empty state when no conversation is selected

Message presentation:

- inbound bubbles on subdued elevated surface
- outbound bubbles accented lightly with green-tinted metadata, not full green fills
- timestamps in quiet metadata text
- system fallback text for non-text messages

### 5.5 Right rail: Contact and lead card

Purpose: make the conversation commercially actionable.

Sections:

- contact card
  - display name
  - phone
  - source placeholder if unknown
  - first seen / last seen
- lead status
  - `Nuevo`
  - `Contactado`
  - `Caliente`
  - `Negociación`
  - `Cliente`
  - `Sin respuesta`
- tags / labels
- quick notes block
- activity summary
  - total inbound
  - total outbound
  - last reply time

At first implementation, the right rail may show provisional or derived data if the backend does not expose dedicated CRM entities yet.

## 6. Data Strategy For Front-Only Phase

The current backend returns flat messages through `/me/messages?limit=20&offset=0`.

For the front-first phase, build a derived mini-CRM model in the client:

### 6.1 Conversation derivation

Group messages by `user_phone` and derive:

- `conversationId`: phone-based stable key for now
- `displayName`: fallback to phone
- `phone`
- `lastMessage`
- `lastMessageAt`
- `unreadCount`: provisional, initially `0` unless backend later provides it
- `leadStatus`: locally assigned placeholder state
- `messages[]`: sorted thread
- `inboundCount`
- `outboundCount`

### 6.2 Lead status handling

Until backend support exists, treat lead status as a front-managed state with one of two temporary approaches:

- ephemeral React state for first cut
- optional `localStorage` persistence keyed by tenant + phone

Recommended for this pass: `localStorage`, so the inbox feels stable during navigation and refreshes.

### 6.3 Notes and tags

Also front-managed in `localStorage` for now:

- `notes`
- `tags`
- optional display name override

This keeps the UI useful immediately without pretending the backend already supports CRM persistence.

## 7. Component Changes

### 7.1 Keep in current file for first pass

For speed, it is acceptable to keep the first implementation inside `DashboardView` plus small helper functions/types, as long as the JSX is split into internal render sections or extracted local components.

If the file becomes too large during implementation, split into:

- `AutomationInboxView`
- `ConversationList`
- `ConversationThread`
- `ConversationSidebar`

### 7.2 Reuse existing UI primitives

Reuse:

- `Card`
- `Button`
- any existing tokenized form styles already aligned with the ERP redesign

Add only if clearly needed:

- compact status chip component or inline chip styles
- search input reuse from current patterns before introducing new abstractions

## 8. Interaction Design

### 8.1 Default selection

On load:

- derive conversations
- auto-select the most recent conversation if one exists

### 8.2 Filters

Filters act on derived conversation metadata:

- `Todos`: all
- `Sin leer`: unread count > 0 once backend supports it; in first pass can be hidden or disabled if always zero
- `Calientes`: lead status `Caliente` or `Negociación`
- `Pendientes`: lead status `Nuevo`, `Contactado`, or `Sin respuesta`

### 8.3 Lead status editing

Right rail should allow changing status via compact pill buttons or a select-like control.

This is the primary place where the pipeline remains visible.

### 8.4 Bot configuration access

The current full configuration form should be demoted into:

- a secondary collapsible card under the inbox
- or a side drawer / modal trigger labeled `Configurar bot`

Recommended first pass: collapsible card below the main CRM grid to avoid adding new overlay complexity.

## 9. Empty, Loading, and Error States

### Loading

- keep current loading spinner for full-page initial load
- add skeleton rows for conversation rail if feasible

### No conversations

Main message:

- `Aún no hay conversaciones registradas`

Support copy:

- explain that incoming WhatsApp activity will appear here once messages are received

### Disconnected WhatsApp

Keep `WhatsAppDisconnectedNotice`, but the inbox area should visually remain the main surface. The notice should sit above it, not replace it.

### No active selection

Show a centered empty-thread state prompting the user to choose a conversation.

## 10. Backend Specification To Implement Later

The front can ship before this, but these backend additions would turn the mini-CRM into a proper product.

### 10.1 Recommended new endpoint

`GET /me/conversations`

Response shape:

```ts
type ConversationSummary = {
  id: string;
  contact_id: string | null;
  user_phone: string;
  display_name: string | null;
  lead_status: "new" | "contacted" | "warm" | "negotiation" | "customer" | "no_response";
  unread_count: number;
  last_message_preview: string | null;
  last_message_type: string;
  last_message_at: string;
  last_direction: "inbound" | "outbound";
  inbound_count: number;
  outbound_count: number;
  tags: string[];
  notes_preview: string | null;
};
```

### 10.2 Recommended thread endpoint

`GET /me/conversations/:id/messages`

Response shape:

```ts
type ConversationThread = {
  conversation: {
    id: string;
    user_phone: string;
    display_name: string | null;
    lead_status: "new" | "contacted" | "warm" | "negotiation" | "customer" | "no_response";
    tags: string[];
    notes: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
  };
  messages: {
    id: string;
    direction: "inbound" | "outbound";
    content: string | null;
    message_type: string;
    created_at: string;
  }[];
};
```

### 10.3 Recommended mutations

- `PATCH /me/conversations/:id`
  - updates `display_name`, `lead_status`, `tags`, `notes`
- `POST /me/conversations/:id/read`
  - clears unread count

### 10.4 Minimum backend fallback

If a full conversations model is too much initially, the minimum viable backend improvement is:

- extend `/me/messages` to include pagination large enough for conversation grouping
- include `contact_name` if known
- include `unread_count` or message-read state

## 11. Testing Strategy

### Unit / rendering

Add tests for:

- grouping flat messages into conversations
- conversation sorting
- lead-status local persistence
- filters
- thread rendering fallback for non-text messages

### E2E

Add one automation dashboard scenario that verifies:

- conversations appear grouped by phone
- selecting a conversation updates the thread
- changing lead status updates the right rail

## 12. Implementation Notes

Recommended execution order:

1. derive conversation view-model from current messages payload
2. replace flat message list with inbox layout
3. move bot configuration out of primary focus
4. add right rail lead context and local persistence
5. refine filters and responsive behavior

## 13. Acceptance Criteria

- The automation page is visually centered on conversations, not settings
- Messages are grouped by conversation, not shown as a flat log
- A selected conversation shows a readable thread
- Every conversation exposes at least a lightweight lead status
- Pipeline is visible as status/filtering, but does not dominate the page
- The page remains useful even before backend CRM endpoints exist
