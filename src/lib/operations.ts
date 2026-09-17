import { apiFetch, getBrowserSessionStore } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/** What `POST /operations/{name}` answers. A refusal is a normal answer, not an HTTP error. */
export type OperationResult<T> =
  | { status: "executed"; result: T }
  | { status: "approval_created"; result: { approval_id: string } }
  | { status: "rejected"; code: string; message: string };

/**
 * Runs one Doppel Operation as the signed-in Owner. Pass the same `idempotencyKey`
 * when retrying the same user action, so a double click never does it twice.
 */
export async function runOperation<T>(
  name: string,
  payload: Record<string, unknown> = {},
  idempotencyKey: string = crypto.randomUUID(),
): Promise<OperationResult<T>> {
  return apiFetch<OperationResult<T>>(`/operations/${name}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

/** The executed result, or an Error whose message the screen can show as is. */
export async function runOperationOrThrow<T>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const answer = await runOperation<T>(name, payload);
  if (answer.status === "executed") return answer.result;
  if (answer.status === "approval_created") {
    throw new Error("Quedó pendiente de aprobación. Revísala en Aprobaciones.");
  }
  throw new Error(answer.message);
}

/** GET a Doppel read route as the signed-in Owner. */
export async function readApi<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { baseUrl: API_URL, session: getBrowserSessionStore() });
}

/** Approves or declines an Approval as the signed-in Owner. */
export async function answerApproval(
  approvalId: string,
  answer: "approve" | "decline",
): Promise<OperationResult<unknown>> {
  return apiFetch<OperationResult<unknown>>(`/approvals/${approvalId}/${answer}`, {
    baseUrl: API_URL,
    session: getBrowserSessionStore(),
    method: "POST",
  });
}
