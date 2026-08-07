import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase-admin.js";

const router = express.Router();


// =========================
// MULTER CONFIG
// =========================

const upload = multer({

  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter(req, file, cb){

    const allowedTypes = [

      "application/pdf",

      "application/msword",

      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    ];


    if(
      allowedTypes.includes(file.mimetype)
    ){

      cb(null,true);

    }else{

      cb(
        new Error("invalid_file_type"),
        false
      );

    }

  }

});




// =========================
// AUTH
// =========================

function authMiddleware(req,res,next){

try{


const auth =
req.headers.authorization;


if(!auth){

return res.status(401).json({

error:"missing_token"

});

}



const token =
auth.split(" ")[1];


req.user =
jwt.verify(

token,

process.env.JWT_SECRET

);



next();



}

catch(error){

return res.status(401).json({

error:"invalid_token"

});

}


}





// =========================
// UPLOAD DOCUMENT
// =========================


router.post(

"/upload-document",

authMiddleware,

upload.single("file"),


async(req,res)=>{


try{


if(!req.file){

return res.status(400).json({

error:"file_required"

});

}



const file =
req.file;



const safeName =

file.originalname

.toLowerCase()

.replace(
/[^a-z0-9.]/g,
"-"
);




const filePath =

`${req.user.auth_user_id}/${Date.now()}-${safeName}`;







const {

data,

error

}=await supabaseAdmin

.storage

.from(
"company-documents"
)

.upload(

filePath,

file.buffer,

{

contentType:
file.mimetype,

upsert:false

}

);






if(error){


console.error(

"STORAGE ERROR:",

error

);


return res.status(500).json({

error:"upload_failed"

});


}






// إنشاء رابط مؤقت للملف الخاص

const {

data:urlData,

error:urlError

}=await supabaseAdmin

.storage

.from(
"company-documents"
)

.createSignedUrl(

data.path,

60 * 60 * 24

);






if(urlError){


return res.status(500).json({

error:"url_generation_failed"

});


}







return res.json({

success:true,


url:urlData.signedUrl,


path:data.path

});




}



catch(error){


console.error(

"UPLOAD DOCUMENT ERROR:",

error

);



return res.status(500).json({

error:error.message || "server_error"

});


}



}

);






export default router;