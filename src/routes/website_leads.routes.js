import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// CREATE WEBSITE LEAD
// =====================================


router.post("/lead", async(req,res)=>{


try{


const {

tenant_id,

full_name,

phone,

email,

message,

property_type,

budget,

city

}=req.body;




if(!tenant_id || !phone){


return res.status(400).json({

success:false,

error:"missing_required_data"

});


}





const supabase =

getSupabase(tenant_id);






// =========================
// SAVE LEAD
// =========================


const {

data:lead,

error

}=


await supabase

.from("leads")

.insert({

tenant_id,


full_name,


phone,


email,


city,


budget,


property_type,


notes:message,


source:"website",


stage:"new",


lead_score:0


})

.select()

.single();






if(error)

throw error;






// =========================
// ACTIVITY
// =========================


await supabase

.from("crm_activities")

.insert({

tenant_id,


lead_id:lead.id,


action:"website_lead",


note:

"New lead from company website"


});








return res.json({

success:true,


message:

"Lead created successfully",


lead_id:

lead.id


});





}

catch(error){


console.error(

"Website Lead Error",

error

);



return res.status(500).json({

success:false,

error:error.message

});


}



});



export default router;