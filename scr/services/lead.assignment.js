import { getSupabase } from "../config/supabase.js";


/**
 * 🎯 SALIH Lead Assignment Engine
 *
 * توزيع العملاء على فريق المبيعات
 */


export async function assignLead({
  tenant_id,
  lead_id
}) {


  try {


    const supabase =
      getSupabase(tenant_id);



    // =========================
    // GET AVAILABLE SALES USERS
    // =========================

    const { data: users, error } =

      await supabase
      .from("users")
      .select("id, full_name, role")
      .eq(
        "tenant_id",
        tenant_id
      )
      .eq(
        "role",
        "agent"
      )
      .eq(
        "is_active",
        true
      );



    if(error)
      throw error;



    if(!users || users.length === 0){


      console.log(
        "⚠️ No sales agents available"
      );


      return null;

    }





    // =========================
    // SIMPLE ROUND ROBIN
    // =========================

    const selectedAgent =

      users[
        Math.floor(
          Math.random() * users.length
        )
      ];







    // =========================
    // ASSIGN LEAD
    // =========================


    await supabase

    .from("leads")

    .update({

      assigned_to:
      selectedAgent.id,


      updated_at:
      new Date()
      .toISOString()

    })

    .eq(
      "id",
      lead_id
    );







    // =========================
    // ACTIVITY LOG
    // =========================


    await supabase

    .from("crm_activities")

    .insert({

      tenant_id,


      lead_id,


      action:
      "lead_assigned",


      note:
      `Assigned to ${selectedAgent.full_name}`


    });







    // =========================
    // NOTIFICATION
    // =========================


    await supabase

    .from("notifications")

    .insert({

      tenant_id,


      title:
      "عميل جديد 🔥",


      body:
      `تم تحويل عميل جديد إلى ${selectedAgent.full_name}`,


      type:
      "lead_assigned"


    });







    return {


      success:true,


      agent:selectedAgent


    };





  }


  catch(error){


    console.error(

      "❌ Lead Assignment Error:",
      error.message

    );


    return {


      success:false,


      error:error.message


    };


  }


}