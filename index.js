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




// =========================
// PLATFORM OWNER
// =========================


import platformRoutes
from "./scr/routes/platform.js";


import dashboardRoutes
from "./scr/scr/routes/dashboard.js";







// =========================
// WEBSITE SYSTEM
// =========================


// Website AI Knowledge

import websiteRoutes
from "./scr/routes/website.js";



// Website Builder

import websiteBuilderRoutes

from "./scr/routes/website.routes.js";



// Website Content

import websiteContentRoutes

from "./scr/routes/website_content.routes.js";



// Website Design

import websiteDesignRoutes

from "./scr/routes/website_design.routes.js";



// Public Website

import publicWebsiteRoutes

from "./scr/routes/render/website.routes.js";



// Website Leads

import websiteLeadRoutes

from "./scr/routes/website_leads.routes.js";



// AI Website Generator

import websiteAIRoutes

from "./scr/routes/website_ai.routes.js";







// =========================
// PLATFORM WEBSITE BUILDER
// =========================


// Templates Builder

import platformWebsiteTemplateRoutes

from "./scr/routes/platform.website.templates.js";




// Sections Builder

import platformWebsiteSectionRoutes

from "./scr/routes/platform.website.sections.js";




// Renderer Engine

import renderWebsiteRoutes

from "./scr/routes/render.website.routes.js";




// Website Orders

import websiteOrdersRoutes

from "./scr/routes/website.orders.routes.js";




// Website Generator

import websiteGeneratorRoutes

from "./scr/routes/website.generator.routes.js";









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




// Website Content

app.use(

"/website/content",

websiteContentRoutes

);




// Website Design

app.use(

"/website/design",

websiteDesignRoutes

);




// Public Website Data

app.use(

"/public/website",

publicWebsiteRoutes

);




// Website Leads

app.use(

"/website",

websiteLeadRoutes

);




// AI Generator

app.use(

"/website/ai",

websiteAIRoutes

);









// =========================
// WEBSITE SALES SYSTEM
// =========================


// Customer website orders

app.use(

"/website/orders",

websiteOrdersRoutes

);




// Build website automatically

app.use(

"/website/generator",

websiteGeneratorRoutes

);









// =========================
// PLATFORM WEBSITE BUILDER
// =========================


// Admin creates templates

app.use(

"/api/platform/website/templates",

platformWebsiteTemplateRoutes

);




// Admin manages sections

app.use(

"/api/platform/website/sections",

platformWebsiteSectionRoutes

);




// Render published websites

app.use(

"/api/render/website",

renderWebsiteRoutes

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


whatsapp:"active",

meta:"active",

email:"active",

vapi:"active",

crm:"active",



// Website

website_ingestion:"active",

website_builder:"active",

website_content:"active",

website_design:"active",

website_ai_generator:"active",

website_template_builder:"active",

website_sections_builder:"active",

website_renderer:"active",

website_orders:"active",

website_generator:"active",

website_leads:"active",




// System

dashboard:"active",

invitations:"active",

platform:"active",

export_worker:"active",

scheduler_worker:"active",

daily_reports:"active"



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

"✅ CRM + AI + Website Builder enabled"

);



}

);