import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * The browser's Supabase client. It signs the Owner in with an emailed code and keeps
 * the session fresh on its own; the Doppel API only verifies the token it sends.
 * Created on first use so a build without the public variables still compiles.
 */
export function getSupabase(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

/** Ends the session; used when the API answers 401 and on logout. */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}
