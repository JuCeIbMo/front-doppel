/** A Bolivian WhatsApp number as people write it: +591 7123 4567; any other, with its "+". */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("591") && digits.length === 11) {
    return `+591 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : value;
}
