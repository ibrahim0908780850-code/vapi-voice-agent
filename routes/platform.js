import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =========================
// AUTH + PLATFORM OWNER
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
decoded.role !== "platform_owner"
&&
decoded.is_platform_owner !== true
){


return res.status(403).json({

error:"not_platform_owner"

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


const supabase =
getSupabase();




const {

data,

error

}=await supabase

.from("company_requests")

.select("*")

.order(

"created_at",

{

ascending:false

}

);





if(error){


return res.status(500).json({

error:"fetch_failed"

});


}




return res.json({

success:true,

requests:data

});



}

catch(error){


console.error(
"GET REQUESTS ERROR",
error
);



return res.status(500).json({

error:"server_error"

});


}


}

);









// =========================
// APPROVE COMPANY
// =========================


router.patch(

"/company-requests/:id/approve",

platformAuth,

async(req,res)=>{


try{


const id =
req.params.id;



const supabase =
getSupabase();




// جلب الطلب

const {

data:request,

error:getError

}=await supabase

.from("company_requests")

.select("*")

.eq(
"id",
id
)

.single();





if(getError || !request){


return res.status(404).json({

error:"request_not_found"

});


}






// إنشاء Tenant


const {

data:tenant,

error:tenantError

}=await supabase

.from("tenants")

.insert({

name:
request.company_name,

website:
request.website,

status:
"active"

})

.select()

.single();





if(tenantError){

throw tenantError;

}







// ربط المستخدم بالشركة


await supabase

.from("users")

.update({

tenant_id:
tenant.id,

role:
"owner"

})

.eq(

"auth_user_id",

request.auth_user_id

);






// تحديث الطلب


await supabase

.from("company_requests")

.update({

status:"approved"

})

.eq(

"id",

id

);





return res.json({

success:true,

message:

"تم تفعيل الشركة"

});



}

catch(error){


console.error(

"APPROVE ERROR",

error

);



return res.status(500).json({

error:"approve_failed"

});


}


}

);









// =========================
// REJECT COMPANY
// =========================


router.patch(

"/company-requests/:id/reject",

platformAuth,

async(req,res)=>{


try{


const id =
req.params.id;


const supabase =
getSupabase();





const {

error

}=await supabase

.from("company_requests")

.update({

status:"rejected"

})

.eq(

"id",

id

);






if(error){


return res.status(500).json({

error:"reject_failed"

});

}



return res.json({

success:true,

message:

"تم رفض الطلب"

});



}

catch(error){


return res.status(500).json({

error:"server_error"

});


}


}

);





export default router;