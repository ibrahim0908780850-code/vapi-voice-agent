import { Worker } from "bullmq";

import { redis } from "../config/redis.js";

import { generateDailyReport }
from "../ai/daily.report.engine.js";


import { generateExport }
from "../ai/export.engine.js";


import { sendDailyNotifications }
from "../ai/notification.engine.js";


import { getSupabase }
from "../config/supabase.js";





const worker = new Worker(

"scheduler-jobs",


async(job)=>{


const {
tenant_id,
type
}=job.data;



console.log(
"⏰ Scheduler running:",
type,
tenant_id
);





switch(type){



case "daily_report":


await generateDailyReport(
tenant_id
);


break;





case "daily_export":


await generateExport(
tenant_id
);


break;





case "notifications":


await sendDailyNotifications(
tenant_id
);


break;



default:


console.log(
"Unknown scheduler job"
);


}



},


{
connection:redis
}


);






worker.on(
"completed",
job=>{


console.log(
"✅ Scheduler completed:",
job.name
);


}

);



worker.on(
"failed",
(job,error)=>{


console.error(
"❌ Scheduler failed:",
error.message
);


}

);