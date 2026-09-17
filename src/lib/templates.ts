/** One Template as `GET /dashboard/templates` reads it from Meta. */
export type MessageTemplate = {
  name: string;
  category: string;
  language: string;
  /** Meta's word: APPROVED, PENDING, REJECTED, PAUSED or DISABLED. */
  status: string;
  body: string;
  rejected_reason: string | null;
};

export const TEMPLATE_STATUS: Record<string, string> = {
  APPROVED: "Aprobada",
  PENDING: "En revisión",
  REJECTED: "Rechazada",
  PAUSED: "Pausada",
  DISABLED: "Desactivada",
};

export const TEMPLATE_CATEGORY: Record<string, string> = {
  UTILITY: "Aviso",
  MARKETING: "Promoción",
};

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

/** How many different gaps a body has: {{1}} and {{2}} used twice is still two. */
export function placeholderCount(body: string): number {
  return new Set(Array.from(body.matchAll(PLACEHOLDER), (found) => found[1])).size;
}

/** The body with each gap filled, or left as {{n}} while it is still empty. */
export function renderTemplate(body: string, values: string[]): string {
  return body.replace(PLACEHOLDER, (gap, number: string) => values[Number(number) - 1] || gap);
}

/** Meta's rule for a template name: lowercase letters, digits and underscores. */
export function templateName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 512);
}
