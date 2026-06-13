const enabledFeatures = {
  inventory: true,
  products: true,
  sales: true,
  clients: true,
  finance: true,
  settings: true,
  reports: true,
  activity: true,
  cashier: true,
  demo: false,
} as const;

export type FeatureName = keyof typeof enabledFeatures;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return enabledFeatures[feature];
}

export function getFeatureFlags() {
  return enabledFeatures;
}
