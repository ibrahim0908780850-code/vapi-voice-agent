import express from "express";
import crypto from "crypto";

import { getSupabase } from "../config/supabase.js";
import { generateAIResponse } from "../ai/brain.js";

import { getLeadMemory } from "../../ai/memory.js";
import { buildAIContext } from "../../ai/build _context.js";
import { analyzeDeal } from "../../ai/deal intelligence.js";

import { resolveTenant } from "../utils/resolveTenant.js";


const router = express.Router();



router.post("/", async (req, res) => {


const toolCallId =
req.body?.message?.toolCalls?.[0]?.id ||
crypto.randomUUID();



try {


// =========================
// TENANT
// =========================

const tenant_id =
await resolveTenant(req);


const supabase =
getSupabase(tenant_id);




// =========================
// CHANNEL
// =========================

const channel =

req.headers["x-channel"]

||

(
req.body?.message?.assistantId

?

"voice"

:

"whatsapp"

);





// =========================
// VAPI TOOL DATA
// =========================

let toolArgs = {};

const rawArgs =

req.body?.message
?.toolCalls?.[0]
?.function
?.arguments;



if(rawArgs){

try{

toolArgs =

typeof rawArgs === "string"

?

JSON.parse(rawArgs)

:

rawArgs;


}catch(e){

console.log(
"Tool arguments parse error"
);

}

}



const fullName =
toolArgs.fullName || null;


const toolPhone =
toolArgs.phoneNumber || null;


const area =
toolArgs.area || null;


const budget =
toolArgs.budget || null;


const intent =
toolArgs.intent || null;


const propertyType =
toolArgs.propertyType || null;



const isToolCall =

req.body?.message
?.toolCalls
?.length > 0;







// =========================
// USER DATA
// =========================


const phone =

toolPhone

||

req.body?.message
?.customer
?.phone

||

req.body?.entry?.[0]
?.changes?.[0]
?.value
?.contacts?.[0]
?.wa_id

||

"unknown";




const email =

req.body?.message
?.customer
?.email

||

null;



const userMessage =

req.body?.message?.text

||

req.body?.entry?.[0]
?.changes?.[0]
?.value
?.messages?.[0]
?.text
?.body

||

"";








// =========================
// CREATE / UPDATE LEAD
// =========================


const {

data:lead,

error:leadError

}

=

await supabase

.from("leads")

.upsert(

{

tenant_id,


full_name:
fullName,


phone,


email,


city:
area,


budget,


intent,


property_type:
propertyType,


source:
channel

},

{

onConflict:
"phone,tenant_id"

}

)

.select()

.single();



if(leadError)
throw leadError;






// =========================
// MEMORY
// =========================

const memory =

await getLeadMemory(

tenant_id,

phone

);





// =========================
// COMPANY DATA
// =========================

const {data:company}=

await supabase

.from("company_settings")

.select("*")

.eq(
"tenant_id",
tenant_id
)

.single();





// =========================
// AI AGENT
// =========================

const {data:agent}=

await supabase

.from("ai_agents")

.select("*")

.eq(
"tenant_id",
tenant_id
)

.eq(
"status",
"active"
)

.maybeSingle();





// =========================
// KNOWLEDGE BASE
// =========================

const {data:knowledge}=

await supabase

.from("ai_knowledge_base")

.select("*")

.eq(
"tenant_id",
tenant_id
);





// =========================
// BUILD AI CONTEXT
// =========================

const tenantContext =

buildAIContext({

memory,

company,

agent,

knowledge

});





// =========================
// AI RESPONSE
// =========================

const aiResult =

await generateAIResponse({

tenant_id,

lead_id:
lead.id,

message:
userMessage,

phone,

email,

channel,

tenantContext

});

const aiReply =

aiResult?.response ||

aiResult ||

"";



/*
=========================
DEAL INTELLIGENCE
=========================
*/


const dealResult =

await analyzeDeal({

lead,

message:
userMessage,

tenantContext

});



/*
=========================
LEAD ROUTING TO SALES TEAM
=========================
*/


if (

dealResult.score >= 70

) {


  // تحديث حالة العميل

  await supabase

  .from("leads")

  .update({

    stage:
    "hot",

    lead_score:
    dealResult.score

  })

  .eq(

    "id",

    lead.id

  );





  /*
  =========================
  FIND SALES AGENT
  =========================
  */


  const { data: salesAgent } =

  await supabase

  .from("users")

  .select("id")

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

  )

  .limit(1)

  .maybeSingle();






  if(salesAgent){


    // ربط العميل بالموظف


    await supabase

    .from("leads")

    .update({

      assigned_to:

      salesAgent.id

    })

    .eq(

      "id",

      lead.id

    );





    /*
    =========================
    CREATE NOTIFICATION
    =========================
    */


    await supabase

    .from("notifications")

    .insert({

      tenant_id,


      title:

      "🔥 Lead ساخن جديد",


      body:

      `عميل مهتم يحتاج متابعة: ${phone}`,


      type:

      "hot_lead"


    });






    /*
    =========================
    CRM ACTIVITY
    =========================
    */


    await supabase

    .from("crm_activities")

    .insert({

      tenant_id,


      lead_id:

      lead.id,


      action:

      "lead_assigned",


      note:

      `تم تحويل العميل لفريق المبيعات`

    });


  }


}




// =========================
// RESPONSE
// =========================


return res.json({

success:true,

channel,

lead,

response:

aiReply

});




} catch(error) {


console.error(

"AI Gateway Error:",

error

);



return res.status(500).json({

success:false,

error:"server_error"

});


}


});



export default router;