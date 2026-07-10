import express from "express";

import { getSupabase } from "../config/supabase.js";

const router = express.Router();



// =====================================
// CUSTOMER CREATE WEBSITE ORDER
// =====================================

router.post("/create", async (req, res) => {

    try {


        const {

            customer_name,
            company_name,
            email,
            phone,
            industry_type,
            template_id,
            meta

        } = req.body;



        if(
            !customer_name ||
            !company_name ||
            !industry_type
        ){

            return res.status(400).json({

                success:false,

                error:"missing_data"

            });

        }



        const supabase = getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .insert({

            customer_name,

            company_name,

            email,

            phone,

            industry_type,

            template_id,

            status:"pending",

            meta: meta || {}

        })

        .select()

        .single();




        if(error)

            throw error;




        res.json({

            success:true,

            message:
            "Website request created",

            order:data

        });



    }

    catch(error){


        console.error(

            "Website Order Error",

            error

        );


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


});









// =====================================
// ADMIN GET ALL ORDERS
// =====================================

router.get("/", async(req,res)=>{


    try{


        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .select(`

            *,

            website_templates(
                name,
                category
            )

        `)

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

            orders:data

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
// GET SINGLE ORDER
// =====================================

router.get("/:id", async(req,res)=>{


    try{


        const {

            id

        } = req.params;



        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .select(`

            *,

            website_templates(*)

        `)

        .eq(

            "id",

            id

        )

        .single();




        if(error)

            throw error;




        res.json({

            success:true,

            order:data

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
// UPDATE ORDER STATUS
// =====================================

router.patch("/:id/status", async(req,res)=>{


    try{


        const {

            id

        } = req.params;



        const {

            status

        } = req.body;



        const allowed = [

            "pending",
            "reviewing",
            "approved",
            "building",
            "completed",
            "failed"

        ];



        if(!allowed.includes(status)){


            return res.status(400).json({

                success:false,

                error:"invalid_status"

            });


        }




        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .update({

            status

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

            order:data

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
// ASSIGN TEMPLATE
// =====================================

router.patch("/:id/template", async(req,res)=>{


    try{


        const {

            id

        } = req.params;



        const {

            template_id

        } = req.body;



        if(!template_id){


            return res.status(400).json({

                success:false,

                error:"template_required"

            });


        }



        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .update({

            template_id,

            status:"approved"

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

            order:data

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
// APPROVE ORDER
// =====================================

router.post("/:id/approve", async(req,res)=>{


    try{


        const {

            id

        } = req.params;



        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

        .from("website_orders")

        .update({

            status:"approved"

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

            message:
            "Order approved",

            order:data

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