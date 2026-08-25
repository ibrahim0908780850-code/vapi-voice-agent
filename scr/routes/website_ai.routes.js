import express from "express";

import { getSupabase } from "../config/supabase.js";

import { generateAIResponse } from "../ai/brain.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { websiteBelongsToTenant } from "../../server/lib/resourceAuthorization.js";


const router = express.Router();



// =====================================
// GENERATE WEBSITE CONTENT
// =====================================

router.post("/generate", authenticateRequest, requireTenantIdentity, rejectTenantMismatch, async(req,res)=>{


try{


const {

website_id,

industry_type,

company_name,

city

}=req.body;




if(!company_name){


return res.status(400).json({

success:false,

error:"missing_data"

});


}





const supabase = getSupabase();
const tenant_id = req.tenantId;

if (website_id && !(await websiteBelongsToTenant(supabase, website_id, tenant_id))) {
return res.status(404).json({ success:false, error:"website_not_found" });
}





// =========================
// BUILD AI CONTEXT
// =========================


const prompt = `

You are a professional website copywriter.

Create website content for this company.


Company:

${company_name}


Industry:

${industry_type || "business"}


Location:

${city || ""}



Return ONLY valid JSON:

{

"hero_title":"",

"hero_description":"",

"about_text":"",

"services":[],

"faq":[]

}

`;







const aiResult = await generateAIResponse({

tenant_id,

message:prompt,

channel:"website"

});






let contentText =

aiResult.response || aiResult;





// Remove markdown if AI returns ```json

contentText = contentText

.replace(/```json/g,"")

.replace(/```/g,"")

.trim();






let content;



try{


content = JSON.parse(contentText);


}

catch(error){


content={


hero_title:contentText,


hero_description:"",


about_text:"",


services:[],


faq:[]


};


}









// =========================
// SAVE WEBSITE CONTENT
// =========================


const {

data,

error

}= await supabase

.from("website_content")

.upsert({


tenant_id,


hero_title:
content.hero_title,


hero_description:
content.hero_description,


about_text:
content.about_text,


services:
content.services,


faq:
content.faq



},

{

onConflict:"tenant_id"

})

.select()

.single();






if(error)

throw error;









// =========================
// SAVE AI KNOWLEDGE
// =========================


await supabase

.from("ai_knowledge_base")

.insert({

tenant_id,


category:"website",


title:

`${company_name} website information`,


content:

JSON.stringify(content)



});









res.json({

success:true,


content:data

});






}

catch(error){



console.error(

"AI Website Generator Error",

error

);




res.status(500).json({ success:false, error:"website_ai_generation_failed" });



}



});





export default router;
