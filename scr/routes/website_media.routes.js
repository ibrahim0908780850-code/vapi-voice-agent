import express from "express";

import multer from "multer";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();


const upload = multer({

storage: multer.memoryStorage()

});




// =========================
// UPLOAD WEBSITE IMAGE
// =========================


router.post(
"/upload",
upload.single("image"),

async(req,res)=>{


try{


const {

tenant_id,
section

}=req.body;



if(!req.file || !tenant_id){

return res.status(400).json({

error:"missing_data"

});

}



const supabase =

getSupabase(tenant_id);




const fileName =

`${tenant_id}/${Date.now()}-${req.file.originalname}`;





// Upload Storage

const {

error:uploadError

}=

await supabase.storage

.from("website-media")

.upload(

fileName,

req.file.buffer,

{

contentType:req.file.mimetype

}

);



if(uploadError)

throw uploadError;






const {

data:urlData

}=

supabase.storage

.from("website-media")

.getPublicUrl(fileName);






// Save database


const {

data,

error

}=

await supabase

.from("website_media")

.insert({

tenant_id,

file_url:urlData.publicUrl,

file_type:"image",

section

})

.select()

.single();






if(error)

throw error;





res.json({

success:true,

media:data

});



}

catch(error){


res.status(500).json({

success:false,

error:error.message

});


}


});


export default router;