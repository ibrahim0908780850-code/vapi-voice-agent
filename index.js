const tool = parseTool(req);

if (tool) {
  session.data = { ...session.data, ...tool };
  session.updatedAt = Date.now();

  // =========================
  // HELPERS
  // =========================
  const clean = (v = "") =>
    v.toString().trim().slice(0, 120);

  const normalizePhone = (p = "") =>
    p.toString().replace(/\s+/g, "").trim().slice(0, 30);

  const normalizeStage = (s = "") => {
    const v = s.toString().toLowerCase();

    if (v.includes("hot") || v.includes("urgent")) return "hot";
    if (v.includes("warm") || v.includes("interested")) return "warm";
    if (v.includes("appointment") || v.includes("visit")) return "appointment";
    if (v.includes("lost") || v.includes("no")) return "lost";

    return "new";
  };

  // =========================
  // PAYLOAD (MATCH SUPABASE SCHEMA)
  // =========================
  const payload = {
    full_name: clean(session.data.fullName) || null,

    phone: normalizePhone(
      session.data.phone ||
      session.data.phoneNumber ||
      tool.phone ||
      ""
    ) || null,

    city: clean(session.data.city) || null,
    district: clean(session.data.district) || null,

    budget: clean(session.data.budget) || null,
    property_type: clean(session.data.propertyType) || null,

    intent: clean(tool.intent || session.data.intent) || null,

    stage: normalizeStage(
      tool.stage ||
      tool.leadStatus ||
      session.data.stage ||
      "new"
    ),

    source: "vapi"
  };

  // =========================
  // LEAD SCORING (REALISTIC)
  // =========================
  let score = 5;

  if (payload.phone) score += 25;
  if (payload.full_name) score += 15;
  if (payload.intent) score += 20;

  if (payload.stage === "warm") score += 15;
  if (payload.stage === "hot") score += 30;
  if (payload.stage === "appointment") score += 40;

  payload.lead_score = Math.min(score, 100);

  // =========================
  // VALIDATION
  // =========================
  const valid = payload.phone || payload.full_name;

  const duplicate =
    Date.now() - (session.lastSavedAt || 0) < 15000;

  // =========================
  // SUPABASE WRITE
  // =========================
  if (supabase && valid && !duplicate) {
    session.lastSavedAt = Date.now();

    try {
      // 1. UPSERT LEAD
      const { data: upserted, error } = await supabase
        .from("leads")
        .upsert(payload, {
          onConflict: "phone",
        })
        .select("id")
        .single();

      if (error) {
        console.log("❌ LEADS UPSERT ERROR:", error.message);
        return;
      }

      const leadId = upserted?.id;

      // 2. LOG CALL
      try {
        await supabase.from("calls").insert({
          lead_id: leadId,
          phone: payload.phone,
          transcript: session.data.transcript || null,
          ai_response: session.data.ai_response || null,
          duration: session.data.duration || null,
          call_status: "completed",
          source: "vapi",
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.log("❌ CALL INSERT ERROR:", e.message);
      }

      session.saved = true;
    } catch (e) {
      console.log("❌ SUPABASE ERROR:", e.message);
    }
  }

  // =========================
  // SAVE SESSION
  // =========================
  await saveSession(sessionId, session);

  return res.json({ ok: true, rid });
}