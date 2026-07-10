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



// Platform Owner

import platformRoutes
from "./scr/routes/platform.js";


import dashboardRoutes
from "./scr/routes/dashboard.js";





// =========================
// WEBSITE SYSTEM IMPORTS
// =========================


// Website AI Knowledge Ingestion

import websiteRoutes
from "./website.ingest.js";



// Website Builder

import websiteBuilderRoutes

from "./scr/routes/website.routes.js";



// Website Content

import websiteContentRoutes

from "./scr/routes/website_content.routes.js";



// Website Design

import websiteDesignRoutes

from "./scr/routes/website_design.routes.js";



// Public Website Renderer

import publicWebsiteRoutes

from "./scr/routes/public_website.routes.js";



// Website Leads

import websiteLeadRoutes

from "./scr/routes/website_leads.routes.js";



// AI Website Generator

import websiteAIRoutes

from "./scr/routes/website_ai.routes.js";







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

limit:"10mb"

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
// WEBSITE SYSTEM
// =========================



// Website ingestion

app.use(

"/website",

websiteRoutes

);



// Website Builder

app.use(

"/website/builder",

websiteBuilderRoutes

);



// Website Content Editor

app.use(

"/website/content",

websiteContentRoutes

);



// Website Design Settings

app.use(

"/website/design",

websiteDesignRoutes

);



// Public Websites

app.use(

"/public/website",

publicWebsiteRoutes

);



// Website Leads

app.use(

"/website",

websiteLeadRoutes

);



// AI Website Generator

app.use(

"/website/ai",

websiteAIRoutes

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

"SALIH AI PLATFORM RUNNING 🚀",



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


website_ingestion:
"active",


website_builder:
"active",


website_content:
"active",


website_design:
"active",


public_websites:
"active",


website_leads:
"active",


website_ai_generator:
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

`🚀 SALIH AI PLATFORM running on port ${PORT}`

);



console.log(

"✅ Workers started"

);



console.log(

"✅ Scheduler started"

);



console.log(

"✅ Website Builder enabled"

);



}

);