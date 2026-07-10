import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// SAVE DESIGN SETTINGS
// =====================================

router.post("/save", async(req,res)=>{


try{


const {

tenant_id,

website_id,

primary_color,

secondary_color,

font,

logo,

favicon,

theme,

layout

}=req.body;



if(!tenant_id){


return res.status(400).json({

success:false,

error:"tenant_required"

});


}




const supabase = getSupabase();






const {

data,

error

}= await supabase

.from("website_design_settings")

.upsert({

tenant_id,

website_id,


primary_color:

primary_color || "#2563eb",


secondary_color:

secondary_color || "#1e293b",


font:

font || "Cairo",


logo:logo || null,


favicon:favicon || null,


theme:

theme || "modern",


layout:

layout || "default",


updated_at:new Date()


},

{

onConflict:"tenant_id"

})

.select()

.single();







if(error)

throw error;







res.json({

success:true,

settings:data

});





}

catch(error){


console.error(

"Website Design Error",

error

);



res.status(500).json({

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
getSupabase();





const {

data,

error

}= await supabase

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