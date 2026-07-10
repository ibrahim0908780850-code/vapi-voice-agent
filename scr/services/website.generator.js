import { getSupabase } from "../config/supabase.js";



// =====================================
// WEBSITE GENERATOR
// =====================================


export async function generateWebsite(order_id){


const supabase = getSupabase();




// Get order

const {

data:order,

error:orderError

}=


await supabase

.from("website_orders")

.select("*")

.eq(

"id",

order_id

)

.single();



if(orderError)

throw orderError;







// Create website


const {

data:website,

error:websiteError

}=


await supabase

.from("websites")

.insert({

order_id,

template_id:

order.template_id,

status:"draft"

})

.select()

.single();



if(websiteError)

throw websiteError;









// Create default content


await supabase

.from("website_content")

.insert({

website_id:

website.id,


company_name:

order.company_name,


hero_title:

`مرحباً بكم في ${order.company_name}`


});









// Update order


await supabase

.from("website_orders")

.update({

status:"preview",

website_id:

website.id

})

.eq(

"id",

order_id

);






return website;



}