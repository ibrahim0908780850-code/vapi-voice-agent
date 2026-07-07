import { generateDailyReport } from "../ai/daily.report.engine.js";
import { getSupabase } from "../config/supabase.js";


/**
 * ⏰ تشغيل التقرير اليومي لكل شركة
 */
export async function runDailyReports(tenants) {

  try {


    for (const tenant of tenants) {


      console.log(
        `📊 Generating report for ${tenant.id}`
      );



      const report =

        await generateDailyReport(
          tenant.id
        );




      const supabase =
        getSupabase(
          tenant.id
        );




      // حفظ التقرير
      await supabase
      .from("crm_activities")
      .insert({

        tenant_id:
        tenant.id,

        action:
        "daily_report_generated",

        note:
        JSON.stringify(report),

        entity_type:
        "report"

      });





      console.log(
        `✅ Report completed: ${tenant.id}`
      );


    }




    console.log(
      "🚀 All daily reports generated successfully"
    );



  }


  catch(error){


    console.error(
      "❌ Daily report job error:",
      error.message
    );


  }

}