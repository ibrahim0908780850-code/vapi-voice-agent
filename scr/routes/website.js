import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



router.post("/ingest", async (req,res)=>{


try{


const {
url,
tenant_id
}=req.body;



if(!url || !tenant_id){

return res.status(400).json({

error:"missing_data"

});

}



const supabase =

getSupabase(tenant_id);





// =========================
// FETCH WEBSITE
// =========================


const response =

await axios.get(url,{

timeout:15000,

headers:{

"User-Agent":
"SALIH-AI-Bot"

}

});




const html =
response.data;



const $ =
cheerio.load(html);





const text =

$("body")

.text()

.replace(/\s+/g," ")

.trim()

.slice(0,10000);







if(!text){


return res.status(400).json({

error:
"no_content_found"

});


}






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
`Website: ${url}`,


content:
text,


category:
"company"


})

.select()

.single();






if(error){

throw error;

}






return res.json({


success:true,


message:
"Website added to AI knowledge base",


data


});




}

catch(error){


console.error(

"Website ingestion error:",

error.message

);



return res.status(500).json({

success:false,

error:error.message

});


}



});



export default router;