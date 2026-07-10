import express from "express";

import { getSupabase } from "../config/supabase.js";

import { buildWebsiteComponents }

from "../services/website.component.engine.js";



const router = express.Router();





router.get("/:tenant_id", async(req,res)=>{


try{


const {

tenant_id

}=req.params;



const supabase=getSupabase();




// Get website

const {

data:website

}=


await supabase

.from("websites")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.eq(

"status",

"published"

)

.single();





if(!website){


return res.status(404).json({

error:"website_not_found"

});


}






const components =

await buildWebsiteComponents(

tenant_id,

website.template_id

);






res.json({

success:true,


website,


components


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