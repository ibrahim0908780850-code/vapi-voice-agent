import express from "express";


// =========================
// ROUTES
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







// =========================
// HEALTH CHECK
// =========================

app.get(
  "/",
  (req,res)=>{

    res.send(
      "SALIH CRM RUNNING 🚀"
    );

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


});






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


}
);