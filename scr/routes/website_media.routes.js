import express from "express";

import multer from "multer";

import { getSupabase } from "../config/supabase.js";
import { authenticateRequest, rejectTenantMismatch, requireTenantIdentity } from "../../server/lib/requestAuth.js";
import { createMulterFileFilter, createSafeStoragePath, sendUploadError, UPLOAD_POLICIES, validateUploadedFile } from "../../server/lib/uploadSecurity.js";
import { websiteBelongsToTenant } from "../../server/lib/resourceAuthorization.js";


const router = express.Router();



const upload = multer({

    storage: multer.memoryStorage(),

    limits: {

        fileSize: UPLOAD_POLICIES.image.maxBytes,
        files: 1,
        fields: 10

    },
    fileFilter: createMulterFileFilter("image")

});




// =====================================
// UPLOAD WEBSITE IMAGE
// =====================================


router.post(
"/upload",
authenticateRequest,
requireTenantIdentity,
rejectTenantMismatch,
(req, res, next) => upload.single("image")(req, res, (error) => error ? sendUploadError(res, error) : next()),

async(req,res)=>{


try{


const {
website_id,

section

}=req.body;



if(!req.file){


return res.status(400).json({

success:false,

error:"missing_data"

});


}



const supabase =
getSupabase();

const tenant_id = req.tenantId;

const validation = validateUploadedFile(req.file, "image");
if (!validation.ok) return sendUploadError(res, { code: validation.code });

if (website_id && !(await websiteBelongsToTenant(supabase, website_id, tenant_id))) {
  return res.status(404).json({ success: false, error: "website_not_found" });
}





// Clean filename

const fileName = createSafeStoragePath({
  tenantId: tenant_id,
  namespace: website_id ? `website-${website_id}` : "website-main",
  extension: validation.extension
});






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



res.status(500).json({ success:false, error:"media_upload_failed" });


}


});




export default router;
