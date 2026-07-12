import axios from "axios";

import { getPropertyRecommendations } 
from "../../ai/recommendation.engine.js";

import { runAutopilot } 
from "./autopilot.engine.js";


import { getLeadMemory } 
from "../../ai/memory.js";

import { analyzeLeadIntelligence } 
from "../ai/lead.intelligence.js";



/**
 * 🧠 SALIH CENTRAL AI BRAIN
 * Voice + WhatsApp + Messenger + Instagram + Email
 */


export async function generateAIResponse({

  tenant_id,
  lead_id,
  message,
  channel,

  user_id,
  email,
  phone,

  tenantContext

}) {


try {



if(!process.env.GEMINI_API_KEY){

 throw new Error(
  "Missing GEMINI_API_KEY"
 );

}




// =========================
// MEMORY
// =========================

const memory =

await getLeadMemory(

  tenant_id,

  phone

);





// =========================
// LEAD INTELLIGENCE
// =========================

const intelligence =

await analyzeLeadIntelligence({

  tenant_id,

  phone

})

||

{

 stage:"new",

 score:0,

 summary:""

};







// =========================
// PROPERTY RECOMMENDATIONS
// =========================


const recommendations =

lead_id

?

await getPropertyRecommendations(

 tenant_id,

 lead_id

)

:

[];





const formattedRecommendations =

recommendations.map(r => ({


title:

r.property?.title || "",



price:

r.property?.price || "",



city:

r.property?.city || "",



type:

r.property?.type || "",



bedrooms:

r.property?.bedrooms || "",



score:

r.score || 0


}));









// =========================
// AI PROMPT
// =========================


const prompt = `

أنت SALIH AI.

أنت موظف مبيعات عقارية محترف داخل الشركة.


معلومات الشركة:

${tenantContext}




حالة العميل:

المرحلة:
${intelligence.stage}


النقاط:
${intelligence.score}


الملخص:
${intelligence.summary}




ذاكرة العميل:

${
memory?.messages

?.map(m => m.message)

.join("\n")

||

"لا يوجد سجل سابق"

}





رسالة العميل:

${message}




العقارات المتاحة:

${JSON.stringify(

formattedRecommendations,

null,

2

)}




قواعد العمل:

- تحدث باسم الشركة.
- لا تخترع معلومات.
- استخدم البيانات الموجودة فقط.
- اقترح العقار الأنسب.
- حاول تحويل العميل إلى موعد.
- اجعل الرد مختصر واحترافي.
- لا تقل أنك ذكاء اصطناعي.
- اسأل سؤالاً واحداً فقط في كل مرة.



القناة:

${channel}


`;









// =========================
// GEMINI
// =========================


const response =

await axios.post(


`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,



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


}



);








const aiResponse =


response

?.data

?.candidates?.[0]

?.content

?.parts?.[0]

?.text


||


"مرحباً 👋 كيف يمكنني مساعدتك؟";









// =========================
// AUTOPILOT
// =========================


await runAutopilot({

 tenant_id,

 lead_id,

 channel,

 recommendations,

 aiResponse,

 intelligence,

 user_id,

 email,

 phone

});









// =========================
// RETURN
// =========================


return {


response:


aiResponse,



recommendations:


formattedRecommendations,



intelligence


};







}

catch(error){



console.error(

"🧠 SALIH BRAIN ERROR:",

error.message

);



return {


response:

"حدث خطأ مؤقت، حاول مرة أخرى لاحقاً.",



recommendations:

[],



intelligence:

null


};



}


}