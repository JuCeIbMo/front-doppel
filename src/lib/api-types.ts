import type { components } from "@/lib/api-schema";

/**
 * A model of the Doppel API as its OpenAPI declares it. `api-schema.ts` is generated:
 * run `npm run api:types` (OPENAPI_URL overrides the local backend) after the API changes.
 */
export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];
