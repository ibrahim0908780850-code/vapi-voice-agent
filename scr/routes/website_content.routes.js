import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// CREATE / UPDATE WEBSITE CONTENT
// =====================================

router.post("/save", async (req,res)=>{


try{


const {

tenant_id,

hero_title,

hero_description,

about_text,

services,

faq,

contact_info,

seo

}=req.body;



if(!tenant_id){

return res.status(400).json({

success:false,

error:"tenant_required"

});

}



const supabase =

getSupabase(tenant_id);





const {data:existing}=

await supabase

.from("website_content")

.select("id")

.eq(
"tenant_id",
tenant_id
)

.maybeSingle();





let result;



if(existing){


// UPDATE

result = await supabase

.from("website_content")

.update({

hero_title,

hero_description,

about_text,

services,

faq,

contact_info,

seo,

updated_at:
new Date()

})

.eq(

"id",

existing.id

)

.select()

.single();



}

else{


// CREATE

result = await supabase

.from("website_content")

.insert({

tenant_id,

hero_title,

hero_description,

about_text,

services,

faq,

contact_info,

seo

})

.select()

.single();



}




if(result.error)

throw result.error;



res.json({

success:true,

content:result.data

});



}

catch(error){


console.error(

"Website Content Error",

error

);



res.status(500).json({

success:false,

error:error.message

});


}


});







// =====================================
// GET WEBSITE CONTENT
// =====================================


router.get("/:tenant_id", async(req,res)=>{


try{


const {

tenant_id

}=req.params;



const supabase =

getSupabase(tenant_id);





const {data,error}=

await supabase

.from("website_content")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.single();





if(error)

throw error;



res.json({

success:true,

content:data

});



}

catch(error){


res.status(500).json({

success:false,

error:error.message

});


}



});



export default router;