import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



router.post("/ingest", async (req, res) => {


try {


const {
url,
tenant_id
} = req.body;



// =========================
// VALIDATION
// =========================


if(!url || !tenant_id){

return res.status(400).json({

success:false,

error:"missing_data"

});

}




// validate url

let websiteUrl;

try{

websiteUrl = new URL(url);

}

catch{

return res.status(400).json({

success:false,

error:"invalid_url"

});

}




const supabase =

getSupabase(tenant_id);





// =========================
// CHECK EXISTING KNOWLEDGE
// =========================


const {data:existing} =

await supabase

.from("ai_knowledge_base")

.select("id")

.eq(
"tenant_id",
tenant_id
)

.contains(
"metadata",
{
url:url
}
)

.maybeSingle();





if(existing){


return res.json({

success:true,

message:
"Website already exists in knowledge base",

id:
existing.id

});


}







// =========================
// FETCH WEBSITE
// =========================


const response =

await axios.get(

websiteUrl.href,

{

timeout:15000,

maxContentLength:5000000,


headers:{

"User-Agent":
"SALIH-AI-Bot/1.0"

}

}

);





const html =

response.data;





// =========================
// EXTRACT TEXT
// =========================


const $ =

cheerio.load(html);



// remove unnecessary parts

$("script").remove();

$("style").remove();

$("noscript").remove();



const text =

$("body")

.text()

.replace(/\s+/g," ")

.trim();





if(!text){


return res.status(400).json({

success:false,

error:
"no_content_found"

});


}





// limit size

const cleanText =

text.slice(0,15000);








// =========================
// SAVE KNOWLEDGE
// =========================


const {

data,

error

}=


await supabase

.from("ai_knowledge_base")

.insert({

tenant_id,


title:

`Website Knowledge - ${websiteUrl.hostname}`,


content:

cleanText,


category:

"company",


metadata:{

source:
"website",


type:
"website_ingestion",


url:

websiteUrl.href,


domain:

websiteUrl.hostname,


created_by:

"SALIH AI"

}


})

.select()

.single();






if(error){

throw error;

}







// =========================
// RESPONSE
// =========================


return res.json({

success:true,


message:
"Website successfully added to AI knowledge base",


knowledge_id:

data.id


});




}



catch(error){


console.error(

"SALIH Website Ingestion Error:",

error.message

);



return res.status(500).json({

success:false,


error:

"website_ingestion_failed"

});


}


});



export default router;