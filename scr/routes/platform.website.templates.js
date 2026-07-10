import express from "express";

import { getSupabase } from "../config/supabase.js";


const router = express.Router();



// =====================================
// CREATE TEMPLATE
// Platform Owner Only
// =====================================


router.post("/create", async(req,res)=>{


try{


const {

name,

industry_type,

description,

preview_image,

config

}=req.body;



if(!name || !industry_type){


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

.from("website_templates")

.insert({

name,


industry_type,


description,


preview_image,


config,


active:true


})

.select()

.single();





if(error)

throw error;






res.json({

success:true,

template:data

});



}

catch(error){


console.error(

"Template Create Error",

error

);



res.status(500).json({

success:false,

error:error.message

});


}


});









// =====================================
// GET ALL TEMPLATES
// =====================================


router.get("/", async(req,res)=>{


try{


const supabase = getSupabase();




const {

data,

error

}=


await supabase

.from("website_templates")

.select("*")

.order(

"created_at",

{

ascending:false

}

);





if(error)

throw error;





res.json({

success:true,

templates:data

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


router.put("/:id", async(req,res)=>{


try{


const {

id

}=req.params;



const updateData=req.body;




const supabase=getSupabase();





const {

data,

error

}=


await supabase

.from("website_templates")

.update(updateData)

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

template:data

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
// DELETE TEMPLATE
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

.from("website_templates")

.delete()

.eq(

"id",

id

);





if(error)

throw error;






res.json({

success:true,

message:

"Template deleted"

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
// ENABLE / DISABLE TEMPLATE
// =====================================


router.patch("/:id/status", async(req,res)=>{


try{


const {

id

}=req.params;


const {

active

}=req.body;




const supabase=getSupabase();




const {

data,

error

}=


await supabase

.from("website_templates")

.update({

active

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

template:data

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