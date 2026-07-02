import { createClient } from "@supabase/supabase-js";

export function getSupabase(tenantToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: {
          "x-tenant-id": tenantToken || "unknown"
        }
      }
    }
  );
}