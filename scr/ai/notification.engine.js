import { getSupabase } from "../config/supabase.js";


/**
 * 🔔 SALIH Notification Engine
 * إنشاء إشعارات يومية للشركات
 */


export async function sendDailyNotifications(tenant_id) {

  try {

    const supabase = getSupabase(tenant_id);


    // جلب بيانات اليوم
    const today =
      new Date()
      .toISOString()
      .split("T")[0];


    const {
      data: leads
    } = await supabase
      .from("leads")
      .select("id")
      .eq(
        "tenant_id",
        tenant_id
      )
      .gte(
        "created_at",
        `${today}T00:00:00`
      );


    const count =
      leads?.length || 0;



    await supabase
    .from("notifications")
    .insert({

      tenant_id,

      title:
      "Daily AI Report",

      body:
      `تم تسجيل ${count} عملاء جدد اليوم`,

      type:
      "daily",

      read:false

    });



    return {

      success:true,

      leads:count

    };


  }
  catch(error){


    console.error(
      "Notification Engine Error:",
      error.message
    );


    return {

      success:false,

      error:error.message

    };

  }

}