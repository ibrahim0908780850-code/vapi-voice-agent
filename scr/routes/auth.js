import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";


const router = express.Router();


// =========================
// LOGIN
// =========================

router.post(
"/login",
async(req,res)=>{

try{


const {
email,
password
}=req.body;



if(!email || !password){

return res.status(400).json({

error:"email_and_password_required"

});

}



const supabase = getSupabase();



// =========================
// SUPABASE AUTH LOGIN
// =========================


const {
data:authData,
error:authError

}= await supabase.auth.signInWithPassword({

email,

password

});



if(authError || !authData.user){


return res.status(401).json({

error:"invalid_credentials"

});


}



const authUser = authData.user;




// =========================
// GET CRM USER
// =========================


const {
data:user,
error:userError

}= await supabase

.from("users")

.select("*")

.eq(

"auth_user_id",

authUser.id

)

.single();



if(userError || !user){


return res.status(404).json({

error:"user_profile_not_found"

});


}




// =========================
// CREATE SALIH TOKEN
// =========================


const token = jwt.sign(

{

id:user.id,

auth_user_id:user.auth_user_id,

email:user.email,

tenant_id:user.tenant_id,

role:user.role

},

process.env.JWT_SECRET,

{

expiresIn:"7d"

}

);





return res.json({

token,


user:{

id:user.id,

email:user.email,

tenant_id:user.tenant_id,

role:user.role

}

});


}

catch(error){


console.error(

"AUTH LOGIN ERROR:",

error

);



return res.status(500).json({

error:"server_error"

});


}


});







// =========================
// CURRENT USER
// =========================


router.get(
"/me",
async(req,res)=>{


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



return res.json({

user:decoded

});



}

catch(error){


return res.status(401).json({

error:"invalid_token"

});


}


});







// =========================
// LOGOUT
// =========================


router.post(
"/logout",
async(req,res)=>{


return res.json({

success:true

});


});





export default router;