import { formatBs } from "@/lib/currency";

export function useCurrency() {
  return {
    format: formatBs,
  };
}
