import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// SAVE DESIGN SETTINGS
// =====================================

router.post("/save", async (req,res)=>{


try{


const {

tenant_id,

primary_color,

secondary_color,

font,

logo,

favicon

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

.from("website_design_settings")

.select("id")

.eq(

"tenant_id",

tenant_id

)

.maybeSingle();





let result;



if(existing){



result = await supabase

.from("website_design_settings")

.update({

primary_color,

secondary_color,

font,

logo,

favicon,

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



result = await supabase

.from("website_design_settings")

.insert({

tenant_id,

primary_color,

secondary_color,

font,

logo,

favicon

})

.select()

.single();



}





if(result.error)

throw result.error;




return res.json({

success:true,

settings:result.data

});



}

catch(error){


console.error(

"Website Design Error",

error

);



return res.status(500).json({

success:false,

error:error.message

});


}


});







// =====================================
// GET DESIGN SETTINGS
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

.from("website_design_settings")

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

settings:data

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