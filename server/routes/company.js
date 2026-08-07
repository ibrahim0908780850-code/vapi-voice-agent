import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../scr/config/supabase-admin.js";


const router = express.Router();



// =========================
// AUTH MIDDLEWARE
// =========================

function authMiddleware(req,res,next){

try{

const auth = req.headers.authorization;


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
// CREATE COMPANY REQUEST
// =========================


router.post(
"/request",
authMiddleware,
async(req,res)=>{


try{


const {

company_name,
website,
description,
document_url,
phone,
company_type

}=req.body;





if(!company_name){


return res.status(400).json({

error:"company_name_required"

});

}



const userId =
req.user.auth_user_id;



// =========================
// CHECK USER COMPANY
// =========================


const {

data:user

}= await supabaseAdmin

.from("users")

.select(
"tenant_id"
)

.eq(
"auth_user_id",
userId
)

.single();



if(user?.tenant_id){


return res.status(400).json({

error:"already_has_company"

});


}





// =========================
// CHECK PENDING REQUEST
// =========================


const {

data:pending

}= await supabaseAdmin

.from("company_requests")

.select("id,status")

.eq(
"auth_user_id",
userId
)

.eq(
"status",
"pending"
)

.maybeSingle();





if(pending){


return res.status(400).json({

error:"request_already_pending"

});


}





// =========================
// CREATE REQUEST
// =========================


const {

data,
error

}= await supabaseAdmin

.from("company_requests")

.insert({

auth_user_id:userId,


full_name:
req.user.email,


email:
req.user.email,


phone:
phone || null,


company_name,


company_type:
company_type || "general",


website:
website || null,


description:
description || null,


document_url:
document_url || null,


status:"pending"


})

.select()

.single();






if(error){


console.error(
"CREATE COMPANY REQUEST ERROR:",
error
);


return res.status(500).json({

error:"request_failed"

});


}






return res.json({

success:true,


message:
"تم إرسال طلب تفعيل الشركة بنجاح",


request:data


});





}


catch(error){


console.error(

"COMPANY REQUEST ERROR:",

error

);



return res.status(500).json({

error:"server_error"

});


}


});





export default router;