import { schedulerQueue }
from "../queues/scheduler.queue.js";


import { getSupabase }
from "../config/supabase.js";





export async function startScheduler(){



const supabase =
getSupabase();





const { data: tenants } =

await supabase
.from("tenants")
.select("*");





for(const tenant of tenants || []){



await schedulerQueue.add(

"daily-report",

{

tenant_id:
tenant.id,

type:
"daily_report"

},

{

repeat:{
pattern:
"0 2 * * *"
}

}

);





await schedulerQueue.add(

"daily-export",

{

tenant_id:
tenant.id,

type:
"daily_export"

},

{

repeat:{
pattern:
"30 2 * * *"
}

}

);





await schedulerQueue.add(

"notifications",

{

tenant_id:
tenant.id,

type:
"notifications"

},

{

repeat:{
pattern:
"0 8 * * *"
}

}

);



}



console.log(
"⏰ SALIH Scheduler Started"
);



}