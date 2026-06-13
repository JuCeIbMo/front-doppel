export function buildEntityHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "sale":
      return `/dashboard/sales/${entityId}`;
    case "product":
      return `/dashboard/products/${entityId}`;
    case "client":
      return `/dashboard/clients/${entityId}`;
    default:
      return null;
  }
}
