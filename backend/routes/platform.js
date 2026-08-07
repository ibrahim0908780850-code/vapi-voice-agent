import express from "express";
import jwt from "jsonwebtoken";

import { supabaseAdmin } from "../config/supabase-admin.js";


const router = express.Router();



// =========================
// AUTH + PLATFORM OWNER CHECK
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
error:"platform_access_only"
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
// GET COMPANY REQUESTS
// =========================


router.get(
"/company-requests",
platformAuth,
async(req,res)=>{


try{


const {

data:requests,

error

}= await supabaseAdmin

.from("company_requests")

.select("*")

.order(
"created_at",
{
ascending:false
}
);



if(error)
throw error;



res.json({

success:true,

requests

});



}

catch(error){


console.error(
"GET REQUESTS ERROR:",
error
);



res.status(500).json({

error:error.message

});


}


});









// =========================
// APPROVE COMPANY
// =========================


router.post(
"/approve-company/:id",
platformAuth,
async(req,res)=>{


try{


const requestId =
req.params.id;





// جلب الطلب

const {

data:request,

error:requestError

}= await supabaseAdmin

.from("company_requests")

.select("*")

.eq(
"id",
requestId
)

.single();



if(requestError || !request){

return res.status(404).json({

error:"request_not_found"

});

}





// إنشاء الشركة


const {

data:tenant,

error:tenantError

}= await supabaseAdmin

.from("tenants")

.insert({

name:
request.company_name,

status:"active"

})

.select()

.single();



if(tenantError)
throw tenantError;








// إنشاء مالك الشركة


const {

error:userError

}= await supabaseAdmin

.from("users")

.insert({

auth_user_id:
request.auth_user_id,

tenant_id:
tenant.id,

full_name:
request.full_name,

email:
request.email,

role:"owner",

is_platform_owner:false

});




if(userError)
throw userError;








// إعدادات الشركة


const {

error:settingsError

}= await supabaseAdmin

.from("company_settings")

.insert({

tenant_id:
tenant.id,

company_name:
request.company_name

});




if(settingsError)
throw settingsError;








// إنشاء وكيل صالح


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








// تحديث الطلب


await supabaseAdmin

.from("company_requests")

.update({

status:"approved",

tenant_id:
tenant.id,

approved_at:
new Date()

})

.eq(
"id",
requestId
);







res.json({

success:true,

tenant_id:
tenant.id

});




}

catch(error){


console.error(

"APPROVE COMPANY ERROR:",

error

);



res.status(500).json({

error:error.message

});


}



});









// =========================
// REJECT COMPANY
// =========================


router.post(
"/reject-company/:id",
platformAuth,
async(req,res)=>{


try{


const id =
req.params.id;



const {

error

}= await supabaseAdmin

.from("company_requests")

.update({

status:"rejected"

})

.eq(
"id",
id
);



if(error)
throw error;



res.json({

success:true,

message:
"تم رفض الطلب"

});



}

catch(error){


res.status(500).json({

error:error.message

});


}


});







export default router;