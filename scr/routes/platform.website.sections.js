import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();




// =====================================
// ADD SECTION TO TEMPLATE
// =====================================


router.post("/create", async(req,res)=>{


try{


const {

template_id,

section_type,

title,

position,

settings

}=req.body;




if(!template_id || !section_type){


return res.status(400).json({

success:false,

error:"missing_data"

});

}




const supabase = getSupabase();




const {

data,

error

}=


await supabase

.from("website_template_sections")

.insert({

template_id,

section_type,

title,

position,

settings

})

.select()

.single();





if(error)

throw error;




res.json({

success:true,

section:data

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
// GET TEMPLATE SECTIONS
// =====================================


router.get("/:template_id", async(req,res)=>{


try{


const {

template_id

}=req.params;




const supabase=getSupabase();




const {

data,

error

}=


await supabase

.from("website_template_sections")

.select("*")

.eq(

"template_id",

template_id

)

.order(

"position",

{

ascending:true

}

);





if(error)

throw error;




res.json({

success:true,

sections:data

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
// UPDATE SECTION
// =====================================


router.put("/:id", async(req,res)=>{


try{


const {

id

}=req.params;




const supabase=getSupabase();




const {

data,

error

}=


await supabase

.from("website_template_sections")

.update(

req.body

)

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

section:data

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
// DELETE SECTION
// =====================================


router.delete("/:id", async(req,res)=>{


try{


const {

id

}=req.params;




const supabase=getSupabase();




const {

error

}=


await supabase

.from("website_template_sections")

.delete()

.eq(

"id",

id

);





if(error)

throw error;




res.json({

success:true

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