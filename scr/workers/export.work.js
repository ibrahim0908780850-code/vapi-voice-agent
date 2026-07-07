import { Worker } from "bullmq";

import { redis } from "../config/redis.js";

import { generateExport }
from "../ai/export.engine.js";



const worker = new Worker(

"export-jobs",

async(job)=>{


const {
tenant_id
}=job.data;



console.log(
"📤 Export started:",
tenant_id
);



const result =

await generateExport(
tenant_id
);



console.log(
"✅ Export finished:",
result
);



return result;


},

{
connection:redis
}

);



worker.on(
"failed",
(job,error)=>{

console.error(
"❌ Export Worker Error:",
error.message
);

}
);