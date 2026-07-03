import { generateDailyReport } from "../ai/daily.report.engine.js";

/**
 * ⏰ تشغيل التقرير اليومي لكل شركة
 */

export async function runDailyReports(tenants) {
  try {
    for (const tenant of tenants) {
      await generateDailyReport(tenant.id);
    }

    console.log("Daily reports generated successfully");
  } catch (error) {
    console.error("Daily job error:", error.message);
  }
}