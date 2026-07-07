import axios from "axios";
import { getSupabase } from "../config/supabase.js";


/**
 * 📊 SALIH DAILY REPORT ENGINE
 * تقرير ذكي يومي لكل شركة
 */


export async function generateDailyReport(tenant_id) {


  try {


    const supabase =
      getSupabase(tenant_id);



    const today =
      new Date()
      .toISOString()
      .split("T")[0];



    // =========================
    // LEADS
    // =========================

    const { data: leads } =

      await supabase
      .from("leads")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );



    // =========================
    // CALLS
    // =========================

    const { data: calls } =

      await supabase
      .from("calls")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );



    // =========================
    // MESSAGES
    // =========================

    const { data: messages } =

      await supabase
      .from("messages")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );



    // =========================
    // APPOINTMENTS
    // =========================

    const { data: appointments } =

      await supabase
      .from("appointments")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );



    // =========================
    // DEALS
    // =========================

    const { data: deals } =

      await supabase
      .from("deals")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );





    // =========================
    // KPI CALCULATION
    // =========================


    const hotLeads =

      (leads || [])
      .filter(
        lead =>
        lead.stage === "hot"
      );



    const openDeals =

      (deals || [])
      .filter(
        deal =>
        deal.status === "open"
      );



    const pipelineValue =

      openDeals
      .reduce(

        (sum, deal) =>

        sum + Number(
          deal.value || 0
        ),

        0

      );





    const reportData = {


      date:
      today,


      leads:
      {

        total:
        leads?.length || 0,


        hot:
        hotLeads.length

      },



      communication:
      {

        calls:
        calls?.length || 0,


        messages:
        messages?.length || 0

      },



      appointments:
      appointments?.length || 0,



      sales:
      {

        deals:
        deals?.length || 0,


        pipeline:
        pipelineValue

      }


    };







    // =========================
    // AI SUMMARY
    // =========================


    const prompt = `

أنت مدير مبيعات ذكي داخل SALIH CRM.

حلل تقرير اليوم:

${JSON.stringify(
reportData,
null,
2
)}


اكتب تقريراً احترافياً يحتوي:

- ملخص أداء اليوم
- أهم الفرص
- العملاء الذين يحتاجون متابعة
- توصيات عملية للغد

اجعل التقرير مختصر وواضح.

`;




    let aiSummary = "";



    if(process.env.GEMINI_API_KEY){


      const response =

      await axios.post(


`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,



      {

        contents:[

          {

            parts:[

              {

                text:
                prompt

              }

            ]

          }

        ]

      });



      aiSummary =

      response
      ?.data
      ?.candidates?.[0]
      ?.content
      ?.parts?.[0]
      ?.text

      ||

      "";

    }







    // =========================
    // SAVE REPORT
    // =========================


    const {

      data: savedReport,

      error: saveError

    } =

    await supabase
    .from("daily_reports")
    .insert({

      tenant_id,


      report_date:
      today,


      leads_total:
      reportData.leads.total,


      hot_leads:
      reportData.leads.hot,


      calls_total:
      reportData.communication.calls,


      messages_total:
      reportData.communication.messages,


      appointments_total:
      reportData.appointments,


      deals_total:
      reportData.sales.deals,


      pipeline_value:
      reportData.sales.pipeline,


      ai_summary:
      aiSummary,


      report_data:
      reportData


    })
    .select()
    .single();




    if(saveError){

      console.error(
        "❌ Daily Report Save Error:",
        saveError.message
      );

    }







    // =========================
    // FINAL RESULT
    // =========================


    return {


      success:true,


      report_id:
      savedReport?.id,


      tenant_id,


      generated_at:
      new Date()
      .toISOString(),



      metrics:
      reportData,



      ai_summary:
      aiSummary


    };





  }


  catch(error){


    console.error(

      "❌ Daily Report Engine Error:",
      error.message

    );



    return {


      success:false,


      error:
      error.message


    };


  }


}