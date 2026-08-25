import express from "express";

import { getSupabase } from "../config/supabase.js";

import { authenticateRequest, requireTenantIdentity } from "../../server/lib/requestAuth.js";


const router = express.Router();

function dashboardAuth(req, res, next) {
  return authenticateRequest(req, res, () => requireTenantIdentity(req, res, () => {
    req.tenant_id = req.tenantId;
    req.user = req.auth;
    next();
  }));
}



// =========================
// DASHBOARD STATS
// =========================

router.get(
"/stats",
dashboardAuth,
async (req,res)=>{


try{


const supabase =
getSupabase(req.tenant_id);



const [

leads,

calls,

messages,

appointments,

deals,

properties

] = await Promise.all([


supabase
.from("leads")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id),


supabase
.from("calls")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id),


supabase
.from("messages")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id),


supabase
.from("appointments")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id),


supabase
.from("deals")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id),


supabase
.from("properties")
.select("*",{count:"exact",head:true})
.eq("tenant_id",req.tenant_id)


]);



res.json({

leads:
leads.count || 0,

calls:
calls.count || 0,

messages:
messages.count || 0,

appointments:
appointments.count || 0,

deals:
deals.count || 0,

properties:
properties.count || 0

});


}

catch(error){

res.status(500).json({

error:error.message

});

}


});






// =========================
// LEADS
// =========================

router.get(
"/leads",
dashboardAuth,
async(req,res)=>{


const supabase =
getSupabase(req.tenant_id);


const {data,error}=

await supabase
.from("leads")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.order(
"created_at",
{
ascending:false
}
);



if(error)

return res.status(500)
.json({
error:error.message
});



res.json(data);


});








// =========================
// CALLS
// =========================

router.get(
"/calls",
dashboardAuth,
async(req,res)=>{


const supabase =
getSupabase(req.tenant_id);


const {data,error}=

await supabase
.from("calls")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.order(
"created_at",
{
ascending:false
}
);



if(error)

return res.status(500)
.json({
error:error.message
});



res.json(data);


});








// =========================
// CONVERSATIONS
// =========================

router.get(
"/conversations",
dashboardAuth,
async(req,res)=>{


const supabase =
getSupabase(req.tenant_id);


const {data,error}=

await supabase
.from("conversations")
.select(`
*,
leads(
full_name,
phone
)
`)
.eq(
"tenant_id",
req.tenant_id
)
.order(
"last_message_at",
{
ascending:false
}
);



if(error)

return res.status(500)
.json({
error:error.message
});



res.json(data);


});








// =========================
// PROPERTIES
// =========================

router.get(
"/properties",
dashboardAuth,
async(req,res)=>{


const supabase =
getSupabase(req.tenant_id);



const {data,error}=

await supabase
.from("properties")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.order(
"created_at",
{
ascending:false
}
);



if(error)

return res.status(500)
.json({
error:error.message
});



res.json(data);


});








// =========================
// AI AGENTS
// =========================

router.get(
"/ai-agent",
dashboardAuth,
async(req,res)=>{


try{


const supabase =
getSupabase(req.tenant_id);



const {data,error}=

await supabase
.from("ai_agents")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.order(
"created_at",
{
ascending:false
}
);



if(error){

return res.status(500)
.json({

error:error.message

});

}



res.json(
data || []
);



}

catch(error){


res.status(500)
.json({

error:error.message

});


}


});








// =========================
// COMPANY SETTINGS
// =========================

// Compatibility alias used by the original salih-ai dashboard source.
router.get(
"/agent",
dashboardAuth,
async(req,res)=>{

try{

const supabase =
getSupabase(req.tenant_id);

const {data,error}=
await supabase
.from("ai_agents")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.order(
"created_at",
{
ascending:false
}
);

if(error){
return res.status(500)
.json({
error:error.message
});
}

return res.json(
data || []
);

}
catch(error){
return res.status(500)
.json({
error:error.message
});
}

}
);

router.get(
"/company",
dashboardAuth,
async(req,res)=>{


const supabase =
getSupabase(req.tenant_id);



const {data,error}=

await supabase
.from("company_settings")
.select("*")
.eq(
"tenant_id",
req.tenant_id
)
.single();



if(error)

return res.status(500)
.json({
error:error.message
});



res.json(data);


});








export default router;
