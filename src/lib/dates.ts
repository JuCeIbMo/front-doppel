const DATE_TIME = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A moment as the Owner reads it, in Spanish even on a browser set to English. */
export function formatDateTime(value: string): string {
  return DATE_TIME.format(new Date(value)).replace(/\./g, "");
}
