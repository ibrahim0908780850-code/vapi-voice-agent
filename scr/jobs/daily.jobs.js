import { exportQueue }
from "../queues/export.queue.js";


export async function runDailyExport(tenants){


for(const tenant of tenants){


await exportQueue.add(

"daily-export",

{

tenant_id:
tenant.id

},

{

attempts:3,

backoff:{
type:"exponential",
delay:2000
}

}

);


}



console.log(
"📤 Daily exports queued"
);


}