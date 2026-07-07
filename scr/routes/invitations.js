import express from "express";
import crypto from "crypto";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();




// =================================
// CREATE INVITATION
// =================================

router.post("/create", async (req,res)=>{


try{


const {
tenant_id,
email,
role,
invited_by
}=req.body;



const token =
crypto.randomBytes(32)
.toString("hex");



const supabase =
getSupabase(tenant_id);




const {data,error}=

await supabase
.from("invitations")
.insert({

tenant_id,

email,

role:
role || "agent",

token,

invited_by,

status:
"pending",

expires_at:

new Date(
Date.now()+7*24*60*60*1000
)
.toISOString()


})
.select()
.single();




if(error)
throw error;




res.json({

success:true,

invite_url:

`https://salih.ai/invite/${token}`,

invitation:data

});



}

catch(error){


res.status(500)
.json({

error:error.message

});


}


});








// =================================
// ACCEPT INVITATION
// =================================


router.post("/accept", async(req,res)=>{


try{


const {

token,

auth_user_id,

full_name

}=req.body;





const supabaseMain =
getSupabase();





const {data:invite,error}=

await supabaseMain
.from("invitations")
.select("*")
.eq(
"token",
token
)
.eq(
"status",
"pending"
)
.single();




if(error || !invite){

throw new Error(
"Invalid invitation"
);

}





if(
new Date(invite.expires_at)
<
new Date()
){

throw new Error(
"Invitation expired"
);

}





const supabase =
getSupabase(
invite.tenant_id
);





const {data:user,error:userError}=

await supabase
.from("users")
.insert({

auth_user_id,

tenant_id:
invite.tenant_id,

full_name,

email:
invite.email,

role:
invite.role,

is_active:
true

})
.select()
.single();





if(userError)
throw userError;







await supabase
.from("user_roles")
.insert({

tenant_id:
invite.tenant_id,

user_id:
user.id,

role:
invite.role

});







await supabaseMain
.from("invitations")
.update({

status:
"accepted"

})
.eq(
"id",
invite.id
);






res.json({

success:true,

message:
"User joined company",

user

});




}

catch(error){


res.status(500)
.json({

error:error.message

});


}


});





export default router;