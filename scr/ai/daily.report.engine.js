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
    // LOAD DATA
    // =========================


    const [
      leadsResult,
      callsResult,
      messagesResult,
      appointmentsResult,
      dealsResult
    ] = await Promise.all([


      supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", tenant_id),


      supabase
      .from("calls")
      .select("*")
      .eq("tenant_id", tenant_id),


      supabase
      .from("messages")
      .select("*")
      .eq("tenant_id", tenant_id),


      supabase
      .from("appointments")
      .select("*")
      .eq("tenant_id", tenant_id),


      supabase
      .from("deals")
      .select("*")
      .eq("tenant_id", tenant_id)

    ]);



    const leads =
      leadsResult.data || [];


    const calls =
      callsResult.data || [];


    const messages =
      messagesResult.data || [];


    const appointments =
      appointmentsResult.data || [];


    const deals =
      dealsResult.data || [];





    // =========================
    // KPI
    // =========================


    const hotLeads =
      leads.filter(
        lead =>
        lead.stage === "hot"
      );



    const openDeals =
      deals.filter(
        deal =>
        deal.status === "open"
      );



    const pipelineValue =
      openDeals.reduce(

        (sum,deal)=>

        sum +
        Number(
          deal.value || 0
        ),

        0

      );




    const reportData = {


      date: today,


      leads:{

        total: leads.length,

        hot: hotLeads.length

      },


      communication:{

        calls:calls.length,

        messages:messages.length

      },


      appointments:
      appointments.length,


      sales:{

        deals:deals.length,

        pipeline:pipelineValue

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

اكتب:

- ملخص الأداء
- أهم الفرص
- العملاء الذين يحتاجون متابعة
- توصيات الغد

اجعل التقرير مختصر وعملي.

`;



    let aiSummary = "";



    if(process.env.GEMINI_API_KEY){


      try {


        const model =
        process.env.GEMINI_MODEL ||
        "gemini-1.5-flash-latest";



        const response =

        await axios.post(

`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,

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

        },

        {

          headers:{

            "Content-Type":
            "application/json"

          }

        }

        );



        aiSummary =

        response
        ?.data
        ?.candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text || "";



      }


      catch(aiError){


        console.error(

          "❌ Gemini Error:",
          aiError.response?.data ||
          aiError.message

        );


        aiSummary =
        "AI summary unavailable";


      }


    }







    // =========================
    // SAVE REPORT
    // =========================


    const {
      data:savedReport,
      error:saveError

    } =

    await supabase
    .from("daily_reports")
    .insert({

      tenant_id,


      report_date:today,


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