export async function listCompanyRequests(client) {
  const { data, error } = await client
    .from("company_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
