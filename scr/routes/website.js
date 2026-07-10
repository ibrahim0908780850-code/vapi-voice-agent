import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

import { getSupabase } from "./scr/config/supabase.js";


const router = express.Router();



// =====================================
// INGEST WEBSITE INTO AI KNOWLEDGE
// =====================================

router.post("/ingest", async(req,res)=>{


try{


const {

url,

tenant_id

}=req.body;



if(!url || !tenant_id){


return res.status(400).json({

success:false,

error:"missing_data"

});


}




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




const supabase = getSupabase();







// =========================
// FETCH WEBSITE
// =========================


const response = await axios.get(

websiteUrl.href,

{

timeout:15000,

maxContentLength:5000000,

headers:{

"User-Agent":
"SALIH-AI-Crawler/1.0"

}

}

);





const html=response.data;






// =========================
// EXTRACT CONTENT
// =========================


const $ = cheerio.load(html);



$("script").remove();

$("style").remove();

$("noscript").remove();

$("nav").remove();

$("footer").remove();





const text = $("body")

.text()

.replace(/\s+/g," ")

.trim();





if(!text){


return res.status(400).json({

success:false,

error:"empty_content"

});


}






// =========================
// SPLIT CONTENT
// =========================


const chunks=[];


const size=3000;


for(
let i=0;
i<text.length;
i+=size
){


chunks.push(

text.substring(

i,

i+size

)

);


}







// =========================
// SAVE KNOWLEDGE
// =========================


const records = chunks.map(

(chunk,index)=>(

{

tenant_id,


title:

`Website Knowledge ${index+1}`,


category:

"website",


content:

chunk,


metadata:{

source:"website",


url:websiteUrl.href,


domain:websiteUrl.hostname,


chunk:index+1


}

}

)

);







const {

data,

error

}= await supabase

.from("ai_knowledge_base")

.insert(records)

.select();






if(error)

throw error;







// =========================
// UPDATE COMPANY SETTINGS
// =========================


await supabase

.from("company_settings")

.update({

website:url

})

.eq(

"tenant_id",

tenant_id

);







res.json({

success:true,


message:

"Website indexed successfully",


chunks:data.length


});





}

catch(error){


console.error(

"Website ingestion error",

error

);



res.status(500).json({

success:false,

error:error.message

});


}



});





export default router;