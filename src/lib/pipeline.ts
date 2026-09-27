import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import type { Schema } from "@/lib/api-types";
import { useBusiness } from "@/lib/business";
import { readApi, runOperation } from "@/lib/operations";
import type { MessageTemplate } from "@/lib/templates";
import type { PipelineConversation, PipelineItem } from "@/components/dashboard/automation-crm";

/** How often the inbox asks for new messages, while its tab is in sight. */
export const REFRESH_MS = 5000;

const POLLING = { refetchInterval: REFRESH_MS, refetchIntervalInBackground: false } as const;

export type WhatsappLine = Schema<"WhatsappLineSummary">;

/** The Business's Contact Conversations, kept fresh. */
export function useConversations() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: () => readApi<PipelineConversation[]>("/dashboard/pipeline"),
    ...POLLING,
  });
}

/** One Conversation's messages and Calls, kept fresh; idle until one is chosen. */
export function useConversationThread(conversationId: string | null) {
  return useQuery({
    queryKey: ["pipeline", conversationId, "messages"],
    queryFn: () => readApi<PipelineItem[]>(`/dashboard/pipeline/${conversationId}/messages`),
    enabled: conversationId !== null,
    ...POLLING,
  });
}

export function useWhatsappLine() {
  return useQuery({
    queryKey: ["whatsapp-line"],
    queryFn: () => readApi<WhatsappLine | null>("/dashboard/whatsapp-line"),
  });
}

export function useManagerPhones() {
  return useQuery({
    queryKey: ["manager-phones"],
    queryFn: () => readApi<Schema<"ManagerPhoneSummary">[]>("/dashboard/manager-phones"),
  });
}

/**
 * What the inbox shows around the Conversations: the Business, its Line and whether it
 * loaded. An Owner with a Line but no Manager phone is sent to finish that step first.
 */
export function useInbox() {
  const router = useRouter();
  const businessQuery = useBusiness();
  const lineQuery = useWhatsappLine();
  const phonesQuery = useManagerPhones();
  const conversationsQuery = useConversations();

  const business = businessQuery.data ?? null;
  // A Line that cannot be read counts as not connected, as a missing one does.
  const line = lineQuery.data ?? null;
  const phones = phonesQuery.data;

  useEffect(() => {
    if (!business || !line || !phones || phones.length > 0) return;
    const params = new URLSearchParams();
    params.set("phone", line.display_phone_number);
    params.set("business", business.name);
    router.replace(`/connect/manager?${params.toString()}`);
  }, [business, line, phones, router]);

  const loading =
    businessQuery.isPending ||
    lineQuery.isPending ||
    phonesQuery.isPending ||
    conversationsQuery.isPending;
  const loadFailure =
    (!businessQuery.data && businessQuery.error) ||
    (!conversationsQuery.data && conversationsQuery.error);
  const loadError = !loadFailure
    ? ""
    : loadFailure instanceof ApiError && loadFailure.status !== 0
      ? "No se pudo cargar tu bandeja. Recarga la página en un momento."
      : loadFailure.message || "No se pudo cargar tu bandeja.";

  return {
    business,
    line,
    conversations: conversationsQuery.data,
    refetchConversations: conversationsQuery.refetch,
    loading,
    loadError,
  };
}

/** Turns the bot on or off on the Line; the screen reads the new state at once. */
export function useToggleBot(line: WhatsappLine | null) {
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  const toggle = useCallback(async () => {
    if (!line) return;
    setToggling(true);
    setError("");
    try {
      const answer = await runOperation<{ enabled: boolean }>(
        line.public_agent_enabled ? "disable_public_agent" : "enable_public_agent",
      );
      if (answer.status === "executed") {
        queryClient.setQueryData<WhatsappLine | null>(["whatsapp-line"], (current) =>
          current ? { ...current, public_agent_enabled: answer.result.enabled } : current,
        );
      } else if (answer.status === "approval_created") {
        setError("Quedó pendiente de aprobación.");
      } else {
        setError(answer.message);
      }
    } catch {
      setError("No se pudo cambiar el estado del bot.");
    } finally {
      setToggling(false);
    }
  }, [line, queryClient]);

  return { toggle, toggling, error };
}

/** The Templates Meta approved, the only ones that reach a Contact whose 24 hours are over. */
export function useApprovedTemplates() {
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: () => readApi<MessageTemplate[]>("/dashboard/templates"),
    select: (templates) => templates.filter((template) => template.status === "APPROVED"),
  });
  return {
    templates: query.data ?? null,
    loadError: query.error && !query.data ? "No se pudieron cargar tus plantillas de Meta." : "",
  };
}

/**
 * Sends something to a Contact: a reply or a Template. A retry of the same message reuses
 * its idempotency key, so a double click never sends it twice; the next message gets a new
 * one. It stays pending until `onSent` finishes, and a refusal is an answer, not an error.
 */
export function useSendToContact(name: "reply_to_contact" | "send_template", onSent: () => Promise<void>) {
  const [sendKey, setSendKey] = useState(() => crypto.randomUUID());
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => runOperation(name, payload, sendKey),
    onSuccess: async (answer) => {
      if (answer.status === "rejected") return;
      setSendKey(crypto.randomUUID());
      await onSent();
    },
  });
}

/** Hands a Conversation back to the bot before its pause is over. */
export function useResumeBot(onResumed: () => Promise<void>) {
  return useMutation({
    mutationFn: (contactCode: string) =>
      runOperation("resume_public_agent", { contact_code: contactCode }),
    onSuccess: async (answer) => {
      if (answer.status !== "rejected") await onResumed();
    },
  });
}
