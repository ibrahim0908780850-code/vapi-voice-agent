import express from "express";

import { authMiddleware } 
from "../middleware/auth.js";

import { extractTenant } 
from "../middleware/tenant.js";


const router = express.Router();



router.get(

"/",

authMiddleware,

extractTenant,


(req,res)=>{


const user = req.user;



if(user.is_platform_owner){


return res.json({

type:
"platform_owner",


dashboard:
"platform"


});


}



return res.json({

type:
user.role,


tenant_id:
req.tenant_id,


dashboard:
"company"


});



}



);


export default router;