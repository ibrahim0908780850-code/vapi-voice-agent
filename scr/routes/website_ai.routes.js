import express from "express";

import { getSupabase } from "../config/supabase.js";

import { generateAIResponse } from "../ai/brain.js";


const router = express.Router();



// =====================================
// GENERATE WEBSITE CONTENT
// =====================================


router.post("/generate", async(req,res)=>{


try{


const {

tenant_id,

industry_type,

company_name,

city

}=req.body;




if(!tenant_id || !company_name){


return res.status(400).json({

success:false,

error:"missing_data"

});


}





const supabase =

getSupabase(tenant_id);





// =========================
// AI REQUEST
// =========================


const prompt = `

Create professional website content.

Company:

${company_name}


Industry:

${industry_type}


City:

${city}


Return JSON:

{

hero_title,

hero_description,

about_text,

services,

faq

}

`;







const aiResult =

await generateAIResponse({

tenant_id,


message:prompt,


channel:"website"



});





const contentText =

aiResult.response || aiResult;







let content;



try{


content = JSON.parse(contentText);


}

catch{


content={

hero_title:
contentText,

hero_description:"",

about_text:"",

services:[],

faq:[]

};


}








// =========================
// SAVE CONTENT
// =========================


const {

data,

error

}=


await supabase

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

onConflict:

"tenant_id"

})

.select()

.single();






if(error)

throw error;








return res.json({

success:true,

content:data

});



}

catch(error){


console.error(

"AI Website Generator Error",

error

);



return res.status(500).json({

success:false,

error:error.message

});


}



});



export default router;