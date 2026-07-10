import express from "express";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();


// =====================================
// CREATE WEBSITE
// =====================================

router.post("/create", async (req, res) => {

    try {

        const {
            tenant_id,
            template_id,
            slug
        } = req.body;


        if (!tenant_id || !template_id) {

            return res.status(400).json({
                success: false,
                error: "missing_data"
            });

        }


        const supabase = getSupabase();



        // Check existing primary website

        const {
            data: existing
        } = await supabase
            .from("websites")
            .select("*")
            .eq("tenant_id", tenant_id)
            .maybeSingle();



        if (existing) {

            return res.json({

                success: true,

                message: "Website already exists",

                website: existing

            });

        }



        // Generate slug

        const websiteSlug =
            slug ||
            `company-${Date.now()}`;



        // Create website

        const {

            data: website,

            error: websiteError

        } = await supabase

            .from("websites")

            .insert({

                tenant_id,

                template_id,

                slug: websiteSlug,

                status: "draft"

            })

            .select()

            .single();



        if (websiteError)

            throw websiteError;




        // Create default content


        const {

            error: contentError

        } = await supabase

            .from("website_content")

            .insert({

                tenant_id,

                hero_title:
                "Welcome To Your Website",

                hero_description:
                "Your AI powered business website",

                services: {},

                faq: {},

                contact_info: {}

            });



        if(contentError)

            throw contentError;





        // Create design settings


        const {

            error: designError

        } = await supabase

            .from("website_design_settings")

            .insert({

                tenant_id,

                primary_color:"#2563eb",

                secondary_color:"#1e293b",

                font:"Cairo"

            });



        if(designError)

            throw designError;






        // Create default pages


        const pages = [

            {

                tenant_id,

                page_name:"Home",

                slug:"/",

                content:{}

            },

            {

                tenant_id,

                page_name:"About",

                slug:"about",

                content:{}

            },

            {

                tenant_id,

                page_name:"Services",

                slug:"services",

                content:{}

            },

            {

                tenant_id,

                page_name:"Contact",

                slug:"contact",

                content:{}

            }

        ];



        const {

            error:pagesError

        } = await supabase

            .from("website_pages")

            .insert(pages);



        if(pagesError)

            throw pagesError;





        return res.json({

            success:true,

            website

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
        } = req.params;



        const supabase =
        getSupabase();



        const {

            data,

            error

        } = await supabase

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
        } = req.body;



        const {
            id
        } = req.params;



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
        } = req.params;



        const supabase =
        getSupabase();




        const {

            data,

            error

        } = await supabase

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