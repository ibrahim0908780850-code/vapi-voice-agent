import express from "express";
import bcrypt from "bcryptjs";
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



// =========================
// GET USER
// =========================

const supabase =
getSupabase();



const {
data:user,
error
}= await supabase
.from("users")
.select("*")
.eq(
"email",
email
)
.single();



if(error || !user){


return res.status(401).json({

error:"invalid_credentials"

});


}



// =========================
// CHECK PASSWORD
// =========================


const passwordMatch =
await bcrypt.compare(
password,
user.password_hash
);



if(!passwordMatch){


return res.status(401).json({

error:"invalid_credentials"

});


}




// =========================
// CREATE TOKEN
// =========================


const token =
jwt.sign(

{

id:user.id,

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



res.status(500).json({

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



res.json({

user:decoded

});



}

catch(error){


res.status(401).json({

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


res.json({

success:true

});


});






export default router;