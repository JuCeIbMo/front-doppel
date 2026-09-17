/**
 * Which Owner screens work against the Doppel API today. A screen marked "soon" keeps
 * its code but shows "Próximamente" instead of calling routes the API does not have
 * yet; flip it to "ready" once its backend exists.
 */
const featureStatus = {
  overview: "soon",
  products: "ready",
  inventory: "soon",
  saleDetail: "ready",
  clients: "soon",
  finance: "soon",
  reports: "soon",
  settings: "ready",
} as const satisfies Record<string, FeatureStatus>;

export type FeatureStatus = "ready" | "soon";

export type FeatureName = keyof typeof featureStatus;

export function isFeatureReady(feature: FeatureName): boolean {
  return (featureStatus[feature] as FeatureStatus) === "ready";
}
