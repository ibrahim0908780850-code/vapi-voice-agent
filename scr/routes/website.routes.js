import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// CREATE WEBSITE
// =====================================

router.post("/create", async (req,res)=>{


try{


const {

tenant_id,

template_id

}=req.body;



if(!tenant_id || !template_id){

return res.status(400).json({

success:false,

error:"missing_data"

});

}



const supabase =

getSupabase(tenant_id);




// check existing website

const {data:existing}=

await supabase

.from("websites")

.select("*")

.eq(
"tenant_id",
tenant_id
)

.maybeSingle();



if(existing){

return res.json({

success:true,

message:"Website already exists",

website:existing

});

}





// create website


const {

data,

error

}=


await supabase

.from("websites")

.insert({

tenant_id,

template_id,

status:"draft"

})

.select()

.single();





if(error)

throw error;





return res.json({

success:true,

website:data

});




}

catch(error){


console.error(

"Create Website Error",

error

);


return res.status(500).json({

success:false,

error:error.message

});


}


});






// =====================================
// GET COMPANY WEBSITE
// =====================================


router.get("/:tenant_id", async(req,res)=>{


try{


const {

tenant_id

}=req.params;



const supabase =

getSupabase(tenant_id);




const {data,error}=

await supabase

.from("websites")

.select(`

*,

website_templates(*)

`)

.eq(

"tenant_id",

tenant_id

)

.single();





if(error)

throw error;



res.json({

success:true,

website:data

});



}

catch(error){


res.status(500).json({

success:false,

error:error.message

});


}



});








// =====================================
// UPDATE TEMPLATE
// =====================================


router.put("/:id/template", async(req,res)=>{


try{


const {

template_id

}=req.body;



const {

id

}=req.params;



const supabase =

getSupabase();





const {data,error}=

await supabase

.from("websites")

.update({

template_id

})

.eq(

"id",

id

)

.select()

.single();





if(error)

throw error;



res.json({

success:true,

website:data

});



}

catch(error){


res.status(500).json({

success:false,

error:error.message

});


}



});








// =====================================
// PUBLISH WEBSITE
// =====================================


router.put("/:id/publish", async(req,res)=>{


try{


const {

id

}=req.params;



const supabase =

getSupabase();




const {data,error}=

await supabase

.from("websites")

.update({

status:"published"

})

.eq(

"id",

id

)

.select()

.single();





if(error)

throw error;



res.json({

success:true,

website:data

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