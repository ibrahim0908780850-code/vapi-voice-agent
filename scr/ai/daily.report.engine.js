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
        l => l.stage === "hot"
      );



    const openDeals =

      (deals || [])
      .filter(
        d => d.status === "open"
      );



    const pipelineValue =

      openDeals
      .reduce(
        (sum,d)=>
        sum + Number(d.value || 0),
        0
      );





    const reportData = {


      date: today,


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


اكتب ملخصاً احترافياً:

- أداء اليوم
- أهم الفرص
- العملاء الذين يحتاجون متابعة
- توصيات الغد

اجعل التقرير مختصر وعملي.

`;





    let aiSummary =
      "";



    if(process.env.GEMINI_API_KEY){


      const response =

      await axios.post(


`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,


      {

        contents:[

          {

            parts:[

              {

                text:prompt

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
    // FINAL REPORT
    // =========================


    return {


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

      "Daily Report Engine Error:",
      error.message

    );



    return {

      error:
      true,

      message:
      error.message

    };


  }


}