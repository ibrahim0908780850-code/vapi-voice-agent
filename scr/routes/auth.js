import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();


// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        error: "email_and_password_required"
      });

    }


    const supabase = getSupabase();



    // =========================
    // SUPABASE AUTH
    // =========================

    const {
      data: authData,
      error: authError

    } = await supabase.auth.signInWithPassword({

      email,
      password

    });



    if (authError || !authData.user) {

      return res.status(401).json({

        error:"invalid_credentials"

      });

    }



    const authUser = authData.user;




    // =========================
    // GET CRM USER
    // =========================


    const {

      data:user,
      error:userError

    } = await supabase

    .from("users")

    .select("*")

    .eq(
      "auth_user_id",
      authUser.id
    )

    .single();



    if(userError || !user){

      return res.status(404).json({

        error:"user_profile_not_found"

      });

    }




    // =========================
    // DETERMINE ACCESS
    // =========================


    let next_step = "create_company";

    let message = "";




    // =========================
    // PLATFORM OWNER
    // =========================


    if(user.is_platform_owner === true){


      next_step = "platform";


      message =
      "مرحبا بك مالك المنصة";


    }




    // =========================
    // USER HAS TENANT
    // =========================


    else if(user.tenant_id){


      const {

        data:tenant

      } = await supabase


      .from("tenants")


      .select(

        "status"

      )


      .eq(

        "id",
        user.tenant_id

      )


      .single();




      if(
        tenant &&
        tenant.status === "active"
      ){


        next_step="dashboard";


        message =
        "تم الدخول إلى لوحة الشركة";


      }


      else{


        next_step="pending";


        message =
        "الشركة قيد التفعيل";


      }



    }




    // =========================
    // NO COMPANY
    // =========================


    else{


      const {

        data:request

      } = await supabase


      .from("company_requests")


      .select("*")


      .eq(

        "auth_user_id",
        authUser.id

      )


      .order(

        "created_at",

        {
          ascending:false
        }

      )


      .limit(1)


      .maybeSingle();




      if(!request){


        next_step="create_company";


        message =
        "يرجى إضافة بيانات الشركة";


      }



      else if(
        request.status === "pending"
      ){


        next_step="pending";


        message =
        "طلب الشركة قيد المراجعة";


      }




      else if(
        request.status === "approved"
      ){


        next_step="pending_activation";


        message =
        "تمت الموافقة ويتم تجهيز الشركة";


      }




      else{


        next_step="create_company";


        message =
        "يمكنك إرسال طلب شركة جديد";


      }



    }







    // =========================
    // CREATE JWT
    // =========================


    const token = jwt.sign(


      {

        id:user.id,

        auth_user_id:user.auth_user_id,

        email:user.email,

        tenant_id:user.tenant_id,

        role:user.role,

        is_platform_owner:user.is_platform_owner


      },


      process.env.JWT_SECRET,


      {

        expiresIn:"7d"

      }


    );






    return res.json({


      success:true,


      token,


      next_step,


      message,



      user:{


        id:user.id,


        email:user.email,


        tenant_id:user.tenant_id,


        role:user.role,


        is_platform_owner:user.is_platform_owner


      }



    });





  }


  catch(error){


    console.error(

      "AUTH LOGIN ERROR:",

      error

    );



    return res.status(500).json({


      error:"server_error",


      message:error.message


    });


  }


});







// =========================
// CURRENT USER
// =========================


router.get("/me", async(req,res)=>{


try{


const auth =
req.headers.authorization;



if(!auth){


return res.status(401).json({

error:"missing_token"

});


}



const token =
auth.split(" ")[1];



const decoded =
jwt.verify(

token,

process.env.JWT_SECRET

);



return res.json({

user:decoded

});



}

catch(error){


return res.status(401).json({

error:"invalid_token"

});


}



});







// =========================
// LOGOUT
// =========================


router.post("/logout",(req,res)=>{


return res.json({

success:true

});


});





export default router;