export function analyzeDeal({
  lead,
  messages = [],
  calls = [],
  appointments = [],
  activities = []
}) {

  let score = lead?.lead_score || 0;

  // عدد الرسائل
  score += Math.min(messages.length * 2, 20);

  // عدد المكالمات
  score += Math.min(calls.length * 5, 20);

  // يوجد موعد
  if (appointments.length > 0)
    score += 20;

  // نشاط CRM
  score += Math.min(activities.length, 10);

  score = Math.min(score, 100);

  let stage = "cold";

  if (score >= 80)
    stage = "hot";
  else if (score >= 60)
    stage = "warm";
  else if (score >= 30)
    stage = "new";

  let nextAction = "follow_up";

  if (score >= 90)
    nextAction = "call_now";
  else if (score >= 70)
    nextAction = "send_offer";
  else if (score >= 40)
    nextAction = "whatsapp_followup";

  return {
    score,
    probability: score,
    stage,
    nextAction
  };
}