import express from "express";

import { generateWebsite }
from "../services/website.generator.js";

import { getSupabase }
from "../config/supabase.js";


const router = express.Router();



// =====================================
// BUILD WEBSITE FROM ORDER
// =====================================

router.post("/:order_id/build", async(req,res)=>{


    const {
        order_id
    } = req.params;



    try{


        if(!order_id){


            return res.status(400).json({

                success:false,

                error:"order_id_required"

            });


        }




        const supabase = getSupabase();





        // =========================
        // GET ORDER
        // =========================


        const {

            data:order,

            error:orderError

        } = await supabase

        .from("website_orders")

        .select("*")

        .eq(

            "id",

            order_id

        )

        .single();





        if(orderError)

            throw orderError;







        // =========================
        // CHECK STATUS
        // =========================


        if(order.status === "completed"){


            return res.json({

                success:true,

                message:"Website already generated",

                website_id:order.website_id

            });


        }






        if(order.status === "building"){


            return res.json({

                success:false,

                message:"Website generation already running"

            });


        }








        // =========================
        // UPDATE BUILDING
        // =========================


        await supabase

        .from("website_orders")

        .update({

            status:"building"

        })

        .eq(

            "id",

            order_id

        );









        // =========================
        // GENERATE WEBSITE
        // =========================


        const website = await generateWebsite(

            order_id

        );









        // =========================
        // COMPLETE
        // =========================


        await supabase

        .from("website_orders")

        .update({

            status:"completed",

            website_id:website.id

        })

        .eq(

            "id",

            order_id

        );








        res.json({

            success:true,

            message:

            "Website generated successfully",

            website

        });







    }

    catch(error){



        console.error(

            "Website Build Error",

            error

        );




        // mark failed

        if(order_id){


            const supabase=getSupabase();



            await supabase

            .from("website_orders")

            .update({

                status:"failed"

            })

            .eq(

                "id",

                order_id

            );


        }






        res.status(500).json({

            success:false,

            error:error.message

        });



    }



});





export default router;