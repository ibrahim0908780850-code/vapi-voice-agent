import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase-admin.js";


const router = express.Router();


// تخزين مؤقت في الذاكرة
const upload = multer({

  storage: multer.memoryStorage(),

  limits:{
    fileSize:10 * 1024 * 1024
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
// UPLOAD COMPANY DOCUMENT
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



const fileName =

`${Date.now()}-${file.originalname.replace(/\s/g,"-")}`;







const {

data,

error

}=await supabaseAdmin

.storage

.from("company-documents")

.upload(

fileName,

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






const {

data:urlData

}=supabaseAdmin

.storage

.from("company-documents")

.getPublicUrl(

data.path

);







return res.json({

success:true,

url:urlData.publicUrl

});





}

catch(error){


console.error(
"UPLOAD DOCUMENT ERROR:",
error
);



return res.status(500).json({

error:"server_error"

});


}



}

);



export default router;