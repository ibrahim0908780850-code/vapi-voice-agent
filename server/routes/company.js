import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";

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


const token = auth.split(" ")[1];


const decoded = jwt.verify(
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
description
}=req.body;



if(!company_name){

return res.status(400).json({

error:"company_name_required"

});

}



const supabase = getSupabase();




// إنشاء طلب للشركة

const {
data,
error
}=await supabase

.from("company_requests")

.insert({

auth_user_id:req.user.auth_user_id,

full_name:req.user.email,

email:req.user.email,

company_name,

status:"pending"


})

.select()

.single();





if(error){


console.error(
"COMPANY REQUEST ERROR:",
error
);


return res.status(500).json({

error:"request_failed"

});


}





return res.json({

success:true,

message:
"تم إرسال طلب الشركة بنجاح",

request:data

});



}

catch(error){


console.error(
"CREATE COMPANY ERROR:",
error
);



return res.status(500).json({

error:"server_error"

});


}



});



export default router;