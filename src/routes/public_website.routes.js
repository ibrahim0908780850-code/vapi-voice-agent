import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// GET PUBLIC WEBSITE
// =====================================

router.get("/:tenant_id", async(req,res)=>{


try{


const {

tenant_id

}=req.params;



const supabase =

getSupabase(tenant_id);





// =========================
// WEBSITE
// =========================


const {

data:website,

error:websiteError

}=

await supabase

.from("websites")

.select(`

*,

website_templates(*)

`)

.eq(

"tenant_id",

tenant_id

)

.eq(

"status",

"published"

)

.single();



if(websiteError)

throw websiteError;







// =========================
// CONTENT
// =========================


const {

data:content

}=

await supabase

.from("website_content")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.maybeSingle();








// =========================
// DESIGN
// =========================


const {

data:design

}=

await supabase

.from("website_design_settings")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.maybeSingle();








// =========================
// COMPANY
// =========================


const {

data:company

}=

await supabase

.from("company_settings")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.single();








// =========================
// PROPERTIES
// =========================


const {

data:properties

}=

await supabase

.from("properties")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.limit(20);









return res.json({

success:true,


website,


company,


content,


design,


properties:

properties || []

});




}

catch(error){


console.error(

"Public Website Error",

error

);



return res.status(404).json({

success:false,

error:"website_not_found"

});


}


});



export default router;