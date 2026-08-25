
import express from "express";
import cors from "cors";
import { createCorsOptions, securityHeaders } from "./server/lib/httpSecurity.js";
import { createRateLimiter } from "./server/lib/requestControls.js";


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


import companyRoutes from "./server/routes/company.js";



import invitationRoutes 
from "./scr/routes/invitations.js";


import authRoutes 
from "./scr/routes/auth.js";


import companyUploadRouter from "./routes/companyUpload.js";






// =========================
// PLATFORM OWNER
// =========================


import platformRoutes
from "./scr/routes/platform.js";


import dashboardRoutes
from "./scr/scr/routes/dashboard.js";

import dashboardApiRoutes
from "./scr/routes/dashboard.api.js";






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

app.set("trust proxy", 1);

const authRateLimit = createRateLimiter({ name: "auth", windowMs: 15 * 60 * 1000, max: 20 });
const aiRateLimit = createRateLimiter({ name: "ai", windowMs: 60 * 1000, max: 30 });
const uploadRateLimit = createRateLimiter({ name: "upload", windowMs: 60 * 60 * 1000, max: 30 });
const websiteImportRateLimit = createRateLimiter({ name: "website-import", windowMs: 60 * 60 * 1000, max: 10 });
const websiteOrderRateLimit = createRateLimiter({ name: "website-order", windowMs: 60 * 60 * 1000, max: 10 });
const webhookRateLimit = createRateLimiter({ name: "webhook", windowMs: 60 * 1000, max: 120 });



app.use(
  cors(createCorsOptions())
);
app.use(securityHeaders);




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

limit:"10mb",
verify:(req,_res,buffer)=>{
req.rawBody=buffer;
}

})

);

app.use(
"/api/dashboard",
dashboardApiRoutes
);



// =========================
// AUTH
// =========================

app.use(
"/auth",
authRateLimit,
authRoutes
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

webhookRateLimit,
whatsappRoutes

);



app.use(

"/ai_gateway",

aiRateLimit,
aiGatewayRoutes

);



app.use(

"/meta",

webhookRateLimit,
metaRoutes

);



app.use(

"/email",

webhookRateLimit,
emailRoutes

);



app.use(

"/vapi",

webhookRateLimit,
vapiRoutes

);



app.use(

"/crm",

crmRoutes

);


app.use(
"/company",
companyRoutes
);



app.use("/company/upload-document", uploadRateLimit);
app.use("/company", companyUploadRouter);




// =========================
// WEBSITE SYSTEM
// =========================


// Website ingestion

app.use("/website/ingest", websiteImportRateLimit);
app.use("/website", websiteRoutes);




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

renderWebsiteRoutes

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



app.use("/api/dashboard",dashboardRoutes);






// =========================
// WEBSITE SALES SYSTEM
// =========================


// Customer website orders

app.use("/website/orders/create", websiteOrderRateLimit);
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


console.error("SERVER ERROR:", err?.message || "unknown_error");



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
