import { getSupabase } from "../config/supabase.js";


/**
 * 🧠 AI LEAD MEMORY ENGINE
 */
export async function getLeadMemory(
  tenant_id,
  phone
) {

try {


if(!tenant_id){

 throw new Error(
 "Missing tenant_id"
 );

}


const supabase =
getSupabase(tenant_id);



if(!phone) return null;



const {
data: lead,
error: leadError
}= await supabase

.from("leads")

.select("*")

.eq(
"phone",
phone
)

.eq(
"tenant_id",
tenant_id
)

.maybeSingle();



if(leadError){

 console.error(
 "Lead Memory Error:",
 leadError.message
 );

 return null;

}



if(!lead) return null;





const {
data: messages
}= await supabase

.from("messages")

.select("*")

.eq(
"phone",
phone
)

.eq(
"tenant_id",
tenant_id
)

.order(
"created_at",
{
ascending:false
}
)

.limit(10);






const {
data: activities
}= await supabase

.from("crm_activities")

.select("*")

.eq(
"lead_id",
lead.id
)

.eq(
"tenant_id",
tenant_id
)

.order(
"created_at",
{
ascending:false
}
)

.limit(10);






return {

lead,

messages: messages || [],

activities: activities || []

};



}
catch(error){

console.error(
"🧠 Lead Memory Fatal Error:",
error.message
);


return null;

}

}