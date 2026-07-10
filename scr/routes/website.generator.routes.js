import express from "express";

import { generateWebsite }

from "../services/website.generator.js";


const router = express.Router();





router.post("/:order_id/build",

async(req,res)=>{


try{


const website =

await generateWebsite(

req.params.order_id

);




res.json({

success:true,

message:

"Website generated",

website

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