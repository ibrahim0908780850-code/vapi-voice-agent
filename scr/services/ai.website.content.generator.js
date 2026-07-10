import axios from "axios";

import { getSupabase } from "../config/supabase.js";



export async function generateWebsiteContent(
website_id
){


const supabase = getSupabase();



// جلب بيانات الموقع

const {

data:website,

error

}=


await supabase

.from("websites")

.select(`

*,

website_orders(*),

website_templates(*)

`)

.eq(

"id",

website_id

)

.single();



if(error)

throw error;



const order = website.website_orders;



const prompt = `

أنت خبير إنشاء مواقع شركات.

أنشئ محتوى موقع احترافي باللغة العربية.

بيانات الشركة:

اسم الشركة:
${order.company_name}

النشاط:
${order.industry_type}

الوصف:
${order.description || ""}


أنشئ JSON يحتوي:

hero:
العنوان والوصف والزر

about:
نبذة عن الشركة

services:
قائمة الخدمات

faq:
أسئلة وأجوبة

seo:
title
description
keywords

`;





// استدعاء Gemini

const response = await axios.post(

process.env.GEMINI_URL,

{

prompt

},

{

headers:{

Authorization:

`Bearer ${process.env.GEMINI_KEY}`

}

}

);




const content = response.data;




// حفظ المحتوى


const {

data:saved,

error:saveError

}=


await supabase

.from("website_content")

.insert({

website_id,


content,


status:"generated"

})

.select()

.single();



if(saveError)

throw saveError;




return saved;



}