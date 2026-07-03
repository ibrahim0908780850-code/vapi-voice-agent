import { createClient } from "@supabase/supabase-js";

export function getSupabase(tenant_id) {
  if (!tenant_id) {
    throw new Error("TENANT_ID_REQUIRED");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      global: {
        headers: {
          "x-tenant-id": tenant_id
        }
      }
    }
  );
}