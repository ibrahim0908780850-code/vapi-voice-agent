import { getSupabase } from "../config/supabase.js";



// =====================================
// COMPONENT ENGINE
// =====================================


export async function buildWebsiteComponents(
tenant_id,
template_id
){


const supabase = getSupabase();




// Get sections

const {

data:sections,

error

}=


await supabase

.from("website_template_sections")

.select("*")

.eq(

"template_id",

template_id

)

.eq(

"active",

true

)

.order(

"position",

{

ascending:true

}

);





if(error)

throw error;





const components=[];




for(const section of sections){



let component;



switch(section.section_type){



// =========================
// HERO
// =========================


case "hero":


component={


type:"hero",


title:

section.settings?.title || "",


description:

section.settings?.description || "",


image:

section.settings?.image || "",


button:

section.settings?.button || "تواصل معنا"


};


break;







// =========================
// ABOUT
// =========================


case "about":


component={


type:"about",


title:

section.title,


content:

section.settings?.content || ""


};


break;







// =========================
// PROPERTIES
// =========================


case "properties":



const {

data:properties

}=


await supabase

.from("properties")

.select("*")

.eq(

"tenant_id",

tenant_id

)

.limit(12);





component={


type:"properties",


items:

properties || []


};



break;







// =========================
// SERVICES
// =========================


case "services":


component={


type:"services",


items:

section.settings?.items || []


};


break;







// =========================
// CONTACT
// =========================


case "contact":


component={


type:"contact",


phone:

section.settings?.phone,


email:

section.settings?.email


};



break;







default:


component={


type:

section.section_type,


settings:

section.settings


};



}





components.push(component);



}




return components;



}