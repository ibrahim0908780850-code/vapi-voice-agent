import express from "express";


// =========================
// START BACKGROUND WORKERS
// =========================


// Export Worker
import "./scr/workers/export.worker.js";


// Scheduler Worker
import "./scr/workers/scheduler.worker.js";




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


import { startScheduler }

from "./scr/jobs/scheduler.jobs.js";


startScheduler();







// =========================
// CHANNEL ROUTES
// =========================


// WhatsApp

app.use(

"/whatsapp",

whatsappRoutes

);




// AI CORE

app.use(

"/ai_gateway",

aiGatewayRoutes

);




// Meta

// Messenger + Instagram

app.use(

"/meta",

metaRoutes

);




// Email

app.use(

"/email",

emailRoutes

);




// Vapi Voice

app.use(

"/vapi",

vapiRoutes

);




// CRM

app.use(

"/crm",

crmRoutes

);




// Employee Invitations

app.use(

"/invitations",

invitationRoutes

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


invitations:

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