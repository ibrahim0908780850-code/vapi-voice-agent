import express from "express";
import axios from "axios";

import { getSupabase } from "../config/supabase.js";
import { claimWebhookEvent } from "../../server/lib/requestControls.js";
import { requireConfiguredWebhookSecret, verifyTwilioSignature } from "../../server/lib/webhookSecurity.js";


const router = express.Router();


// =========================
// RESOLVE WHATSAPP TENANT
// =========================

async function resolveWhatsAppTenant(req) {


  const supabase = getSupabase();



  // Twilio WhatsApp
  const to =

    req.body?.To ||
    req.body?.to;



  if(!to){

    throw new Error(
      "Missing WhatsApp destination number"
    );

  }



  const { data, error } =

    await supabase

    .from("tenant_channels")

    .select("*")

    .eq(
      "channel",
      "whatsapp"
    )

    .eq(
      "provider",
      "twilio"
    )

    .eq(
      "external_id",
      to
    )

    .eq(
      "status",
      "active"
    )

    .maybeSingle();





  if(error){

    throw error;

  }





  if(!data){

    throw new Error(
      "WhatsApp tenant not found"
    );

  }





  return data;

}





// =========================
// WHATSAPP WEBHOOK
// =========================


router.post("/", async (req,res)=>{


try{

const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
if (!requireConfiguredWebhookSecret(twilioAuthToken)) return res.sendStatus(503);
const signedUrl = new URL(req.originalUrl, process.env.BASE_URL || `${req.protocol}://${req.get("host")}`).href;
if (!verifyTwilioSignature({
signature:req.get("x-twilio-signature"),
authToken:twilioAuthToken,
url:signedUrl,
params:req.body || {}
})) return res.sendStatus(401);

const messageId = req.body?.MessageSid || req.body?.SmsMessageSid;
const claimed = await claimWebhookEvent({ provider:"twilio-whatsapp", eventId:messageId, rawBody:req.rawBody?.toString("utf8") || JSON.stringify(req.body || {}) });
if (!claimed) return res.json({ success:true, duplicate:true });


const supabase = getSupabase();



// =========================
// TENANT
// =========================


const channel =

await resolveWhatsAppTenant(req);



const tenant_id =

channel.tenant_id;





// =========================
// MESSAGE DATA
// =========================


const phone =

req.body?.From ||

"";



const message =

req.body?.Body ||

"";





if(!phone || !message){


return res.json({

success:false,

error:"missing_message"

});


}





// =========================
// CREATE / UPDATE LEAD
// =========================


const {data:lead,error:leadError}=

await supabase

.from("leads")

.upsert(


{

tenant_id,


phone,


source:"whatsapp"


},


{

onConflict:
"phone,tenant_id"

}


)

.select()

.single();





if(leadError)

throw leadError;







// =========================
// SEND TO AI GATEWAY
// =========================


const aiResponse =

await axios.post(

`${process.env.BASE_URL}/ai_gateway`,


{


tenant_id,


channel:"whatsapp",


message:{


customer:{


phone

},


text:

message


}


},


{


headers:{


"x-channel":
"whatsapp"


}


}


);





// =========================
// GET AI REPLY
// =========================


const reply =

aiResponse.data

?.result

||

aiResponse.data

?.response

||

"";








// =========================
// SAVE MESSAGE
// =========================


await supabase

.from("messages")

.insert({

tenant_id,


lead_id:
lead.id,


phone,


message,


ai_response:
reply,


source:"whatsapp"


});







// =========================
// ACTIVITY
// =========================


await supabase

.from("crm_activities")

.insert({

tenant_id,


lead_id:
lead.id,


action:
"whatsapp_message",


note:
message


});








return res.json({

success:true,


tenant_id,


lead_id:
lead.id,


reply


});





}

catch(error){


console.error(

"WHATSAPP ERROR:",

error.message

);



return res.status(500).json({

success:false,

error:error.message

});


}



});



export default router;
