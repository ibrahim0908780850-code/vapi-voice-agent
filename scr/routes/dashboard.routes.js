import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();


router.get("/", async (req,res)=>{

try {

const {count:leads}=await supabase
.from("leads")
.select("*",{count:"exact",head:true});


const {count:calls}=await supabase
.from("calls")
.select("*",{count:"exact",head:true});


const {count:messages}=await supabase
.from("messages")
.select("*",{count:"exact",head:true});


const {data:agents}=await supabase
.from("ai_agents")
.select("name,status,voice_enabled,whatsapp_enabled");


res.json({

stats:{
leads:leads || 0,
calls:calls || 0,
messages:messages || 0,
conversion:0
},

agents:agents || [],

activities:[]

});


}catch(error){

console.error(error);

res.status(500).json({
error:"Dashboard failed"
});

}

});


export default router;