import express from "express";


// =========================
// START BACKGROUND WORKERS
// =========================


// Export Worker
import "./scr/workers/export.work.js";


// Scheduler Worker
import "./scr/workers/scheduler.worker.js";




// =========================
// JOBS
// =========================

import { startScheduler }

from "./scr/jobs/scheduler.jobs.js";




// =========================
// ROUTES IMPORT
// =========================


import whatsappRoutes 
from "./scr/routes/whatsapp.js";


import aiGatewayRoutes 
from "./scr/routes/ai_gateway.js";


import metaRoutes 
from "./scr/routes/meta.webhook.js";


import emailRoutes 
from "./scr/routes/email.webhook.js";


import vapiRoutes 
from "./scr/routes/vapi.webhook.js";


import crmRoutes 
from "./scr/routes/crm.js";


import invitationRoutes 
from "./scr/routes/invitations.js";


// Platform Owner Routes
import platformRoutes
from "./scr/routes/platform.js";



import dashboardRoutes
from "./scr/scr/routes/dashboard.js";





// =========================
// APP
// =========================


const app = express();





// =========================
// MIDDLEWARE
// =========================


app.use(

express.urlencoded({

extended:false

})

);



app.use(

express.json({

limit:"2mb"

})

);







// =========================
// START SCHEDULER
// =========================


startScheduler();







// =========================
// CHANNEL ROUTES
// =========================



app.use(

"/whatsapp",

whatsappRoutes

);



app.use(

"/ai_gateway",

aiGatewayRoutes

);



app.use(

"/meta",

metaRoutes

);



app.use(

"/email",

emailRoutes

);



app.use(

"/vapi",

vapiRoutes

);



app.use(

"/crm",

crmRoutes

);




// =========================
// INVITATIONS
// =========================


app.use(

"/invitations",

invitationRoutes

);




// =========================
// PLATFORM OWNER
// =========================


app.use(

"/api/platform",

platformRoutes

);




// =========================
// DASHBOARD
// =========================


app.use(

"/dashboard",

dashboardRoutes

);










// =========================
// HEALTH CHECK
// =========================


app.get(

"/",

(req,res)=>{


res.json({


status:

"SALIH CRM RUNNING 🚀",



services:{


whatsapp:
"active",


meta:
"active",


email:
"active",


vapi:
"active",


crm:
"active",


dashboard:
"active",


invitations:
"active",


platform:
"active",


export_worker:
"active",


scheduler_worker:
"active",


daily_reports:
"active"


}


});


}

);









// =========================
// ERROR HANDLER
// =========================


app.use(

(err,req,res,next)=>{


console.error(

"SERVER ERROR:",

err

);



res.status(500)

.json({

error:

"server_error"

});


}

);









// =========================
// START SERVER
// =========================


const PORT =

process.env.PORT || 3000;



app.listen(

PORT,

()=>{


console.log(

`🚀 SALIH CRM running on port ${PORT}`

);



console.log(

"✅ Workers started"

);



console.log(

"✅ Scheduler started"

);



}

);