import express from "express";

import multer from "multer";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



const upload = multer({

    storage: multer.memoryStorage(),

    limits: {

        fileSize: 5 * 1024 * 1024

    },

    fileFilter(req,file,cb){


        if(
            file.mimetype.startsWith("image/")
        ){

            cb(null,true);

        }

        else{

            cb(
                new Error("Only images allowed"),
                false
            );

        }

    }

});




// =====================================
// UPLOAD WEBSITE IMAGE
// =====================================


router.post(
"/upload",
upload.single("image"),

async(req,res)=>{


try{


const {

tenant_id,

website_id,

section

}=req.body;



if(!req.file || !tenant_id){


return res.status(400).json({

success:false,

error:"missing_data"

});


}



const supabase =
getSupabase();





// Clean filename

const safeName =

req.file.originalname

.replace(
/[^a-zA-Z0-9.]/g,
"-"
);






const fileName =

`${tenant_id}/${website_id || "main"}/${Date.now()}-${safeName}`;






// Upload Storage


const {

error:uploadError

}=await supabase.storage

.from("website-media")

.upload(

fileName,

req.file.buffer,

{

contentType:req.file.mimetype,

upsert:false

}

);






if(uploadError)

throw uploadError;







// Public URL


const {

data:urlData

}=supabase.storage

.from("website-media")

.getPublicUrl(

fileName

);







// Save database


const {

data,

error

}=await supabase

.from("website_media")

.insert({

tenant_id,

file_url:urlData.publicUrl,

file_type:"image",

section:section || "general"

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


console.error(

"Website Media Upload Error",

error

);



res.status(500).json({

success:false,

error:error.message

});


}


});




export default router;