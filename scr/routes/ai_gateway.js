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

req.body?.message?.toolCalls?.[0]?.id

||

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

req.body?.channel

||

req.headers["x-channel"]

||

"voice";




// =========================
// TOOL DATA
// =========================


let toolArgs = {};

const rawArgs =

req.body?.message
?.toolCalls?.[0]
?.function
?.arguments

||

req.body?.arguments;



if(rawArgs){

try{


toolArgs =

typeof rawArgs === "string"

?

JSON.parse(rawArgs)

:

rawArgs;


}

catch(error){

console.log(
"Tool arguments parse error"
);

}


}


// =========================
// ASK_SALIH_AI DIRECT BODY
// =========================


if(req.body?.message && typeof req.body.message === "string"){

toolArgs.message = req.body.message;

}


if(req.body?.phoneNumber){

toolArgs.phoneNumber = req.body.phoneNumber;

}


if(req.body?.customerName){

toolArgs.customerName = req.body.customerName;

}


if(req.body?.channel){

toolArgs.channel = req.body.channel;

}






const fullName =

toolArgs.fullName

||

toolArgs.customerName

||

null;



const toolPhone =

toolArgs.phoneNumber

||

null;



const area =

toolArgs.area

||

null;



const budget =

toolArgs.budget

||

null;



const intent =

toolArgs.intent

||

null;



const propertyType =

toolArgs.propertyType

||

null;





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

req.body?.customer
?.phone

||

"unknown";





const email =

req.body?.message
?.customer
?.email

||

null;





const userMessage =

toolArgs.message

||

req.body?.message?.text

||

req.body?.text

||

"";






// =========================
// CREATE LEAD
// submit_lead
// =========================


let lead = null;



if(

fullName

||

propertyType

||

intent

){



const result =

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




lead = result.data;



if(result.error)

throw result.error;



}






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
// MEMORY
// =========================


const memory =

await getLeadMemory(

tenant_id,

phone

);






// =========================
// BUILD CONTEXT
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

lead?.id || null,


message:

userMessage,


phone,


email,


channel,


tenantContext


});





const aiReply =

aiResult?.response

||

"";








// =========================
// DEAL INTELLIGENCE
// =========================


if(lead){


const dealResult =

await analyzeDeal({

lead,


message:

userMessage,


tenantContext


});



if(

dealResult?.score >= 70

){


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


}


}








// =========================
// VAPI RESPONSE
// =========================


return res.json({

success:true,


result:

aiReply,


response:

aiReply,


tenant_id,


lead


});






}


catch(error){



console.error(

"AI Gateway Error:",

error

);



return res.status(500).json({

success:false,

error:

"server_error"

});


}


});



export default router;