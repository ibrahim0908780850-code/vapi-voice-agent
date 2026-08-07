import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";


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
error:"platform_only"
});

}


req.user = decoded;


next();


}

catch{

return res.status(401).json({
error:"invalid_token"
});

}

}





// =========================
// GET REQUESTS
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
}= await supabase

.from("company_requests")

.select(`
*
`)

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

requests:data || []

});


}

catch(error){


console.error(
error
);


res.status(500).json({

error:"fetch_failed"

});


}


});







// =========================
// APPROVE
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




// get request

const {
data:request,
error
}=await supabase

.from("company_requests")

.select("*")

.eq(
"id",
id
)

.single();



if(error || !request){

return res.status(404).json({

error:"request_not_found"

});

}





if(request.status==="approved"){

return res.status(400).json({

error:"already_approved"

});

}






// create tenant

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





if(tenantError)
throw tenantError;






// create/update user


const {
error:userError

}=await supabase

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





if(userError)
throw userError;







// update request


const {
error:updateError

}=await supabase

.from("company_requests")

.update({

status:"approved",

tenant_id:
tenant.id,

approved_by:
req.user.id,

approved_at:
new Date()

})

.eq(
"id",
id
);




if(updateError)
throw updateError;






res.json({

success:true,

message:
"تم تفعيل الشركة بنجاح",

tenant_id:
tenant.id

});



}

catch(error){


console.error(
"APPROVE COMPANY ERROR",
error
);



res.status(500).json({

error:"approve_failed"

});


}


});









// =========================
// REJECT
// =========================


router.patch(
"/company-requests/:id/reject",
platformAuth,
async(req,res)=>{


try{


const supabase =
getSupabase();


const {
error
}=await supabase

.from("company_requests")

.update({

status:"rejected",

rejected_at:
new Date(),

rejected_by:
req.user.id

})

.eq(
"id",
req.params.id
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

error:"reject_failed"

});


}


});




export default router;