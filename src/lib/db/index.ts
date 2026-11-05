import type { DataAdapter } from "./types";

// Adapter selection: if Supabase credentials are present in the environment,
// PrintReady talks to real Supabase (Postgres + Auth). Otherwise it falls
// back to a local SQLite adapter so the product is fully functional with
// zero configuration (development, CI, demos). See docs/DEPLOYMENT.md.
const useSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

let adapter: DataAdapter;
if (useSupabase) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  adapter = require("./supabase").default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  adapter = require("./local").default;
}

export const db: DataAdapter = adapter;
export const isDemoMode = !useSupabase;
