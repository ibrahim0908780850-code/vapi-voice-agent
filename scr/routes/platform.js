import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase-admin.js";


const router = express.Router();



// =========================
// PLATFORM AUTH
// =========================

function platformAuth(req,res,next){


try{


const auth =
req.headers.authorization;


if(!auth){

return res.status(401).json({

error:"missing_token"

});

}



const token =
auth.split(" ")[1];



const decoded =
jwt.verify(

token,

process.env.JWT_SECRET

);



if(
decoded.role !== "platform_owner" &&
decoded.is_platform_owner !== true
){

return res.status(403).json({

error:"not_allowed"

});

}



req.user = decoded;


next();



}

catch(error){


return res.status(401).json({

error:"invalid_token"

});


}


}







// =========================
// APPROVE COMPANY REQUEST
// =========================


router.post(

"/create-company",

platformAuth,

async(req,res)=>{


try{


const {

request_id

}=req.body;




if(!request_id){


return res.status(400).json({

error:"request_id_required"

});


}





// =========================
// GET REQUEST
// =========================


const {

data:request,

error:requestError

}= await supabaseAdmin

.from("company_requests")

.select("*")

.eq(

"id",

request_id

)

.single();





if(requestError || !request){


return res.status(404).json({

error:"request_not_found"

});


}





if(request.status === "approved"){


return res.status(400).json({

error:"already_approved"

});


}







// =========================
// CREATE TENANT
// =========================


const {

data:tenant,

error:tenantError

}= await supabaseAdmin

.from("tenants")

.insert({

name:
request.company_name,

website:
request.website || null,

status:
"active"

})

.select()

.single();






if(tenantError)
throw tenantError;







// =========================
// CREATE COMPANY OWNER
// =========================


const {

error:userError

}= await supabaseAdmin

.from("users")

.update({

tenant_id:
tenant.id,

role:
"owner",

is_platform_owner:false

})

.eq(

"auth_user_id",

request.auth_user_id

);





if(userError)
throw userError;








// =========================
// COMPANY SETTINGS
// =========================


const {

error:settingsError

}= await supabaseAdmin

.from("company_settings")

.insert({

tenant_id:
tenant.id,

company_name:
request.company_name,

industry_type:
"real_estate"

});





if(settingsError)
throw settingsError;








// =========================
// CREATE AI AGENT
// =========================


const {

error:agentError

}= await supabaseAdmin

.from("ai_agents")

.insert({

tenant_id:
tenant.id,

name:
"Salih AI Agent",

status:
"active",

model:
"gemini"

});





if(agentError)
throw agentError;









// =========================
// UPDATE REQUEST
// =========================


const {

error:updateError

}= await supabaseAdmin

.from("company_requests")

.update({

status:"approved",

approved_by:

req.user.id,

approved_at:

new Date()

})

.eq(

"id",

request_id

);






if(updateError)
throw updateError;






return res.json({

success:true,

message:
"تم تفعيل الشركة بنجاح",

tenant_id:
tenant.id

});





}

catch(error){


console.error(

"APPROVE COMPANY ERROR:",

error

);



return res.status(500).json({

error:"server_error",

message:error.message

});


}


}

);




export default router;