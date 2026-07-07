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

role,

token,

invited_by,

expires_at:
new Date(
Date.now()+1000*60*60*24*7
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

catch(err){


res.status(500)
.json({

error:err.message

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

full_name,

email

}=req.body;



// البحث عن الدعوة


const {data:invite,error}=

await getSupabase()
.from("invitations")
.select("*")
.eq(
"token",
token
)
.single();



if(error || !invite){

throw new Error(
"Invitation not found"
);

}





const supabase =
getSupabase(
invite.tenant_id
);





// إنشاء المستخدم


const {data:user,error:userError}=

await supabase
.from("users")
.insert({

auth_user_id,

tenant_id:
invite.tenant_id,

full_name,

email,

role:
invite.role

})
.select()
.single();



if(userError)
throw userError;






// إضافة الصلاحية


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







// تحديث الدعوة


await supabase
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

user

});



}

catch(err){


res.status(500)
.json({

error:
err.message

});


}


});





export default router;