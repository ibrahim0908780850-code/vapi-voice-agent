import express from "express";
import { getsupabase } from "../config/supabase.js";

const router = express.Router();


// =====================================
// WEBSITE LEAD RECEIVER
// =====================================
// استقبال العملاء من المواقع المنشورة
// POST /website/lead
// =====================================

router.post(
  "/lead",
  async (req, res) => {

    try {

      const {
        full_name,
        name,
        email,
        phone,
        message,
        website_id,
        tenant_id,
        property_type,
        intent,
        budget
      } = req.body;


      // الاسم يدعم أكثر من صيغة
      const leadName =
        full_name || name || "Website Visitor";


      if (!phone) {

        return res.status(400).json({

          success:false,
          error:"phone_required"

        });

      }



      // إنشاء Lead داخل CRM

      const { data, error } = await supabase

        .from("leads")

        .insert({

          tenant_id,

          full_name: leadName,

          phone,

          email: email || null,

          message: message || null,

          property_type:
            property_type || null,

          intent:
            intent || null,

          budget:
            budget || null,


          source:"website",

          website_id:
            website_id || null,


          stage:"new"


        })

        .select()

        .single();



      if(error){

        console.error(
          "Supabase Lead Error:",
          error
        );


        return res.status(500).json({

          success:false,

          error:"database_error"

        });

      }



      console.log(
        "🌐 New Website Lead:",
        data.id
      );



      res.json({

        success:true,

        message:
          "Lead received successfully",

        lead_id:
          data.id

      });



    }

    catch(error){


      console.error(

        "Website Lead Error:",

        error

      );



      res.status(500).json({

        success:false,

        error:"server_error"

      });


    }


  }

);



export default router;