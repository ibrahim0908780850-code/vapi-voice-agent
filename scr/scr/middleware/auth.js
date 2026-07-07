import { getSupabase } from "../config/supabase.js";


export async function authMiddleware(req, res, next) {

  try {

    const token =
      req.headers.authorization?.replace("Bearer ", "");


    if (!token) {

      return res.status(401).json({
        error: "AUTH_TOKEN_REQUIRED"
      });

    }


    const supabase = getSupabase();


    const {
      data: {
        user
      },
      error
    } = await supabase.auth.getUser(token);



    if (error || !user) {

      return res.status(401).json({
        error: "INVALID_TOKEN"
      });

    }



    // جلب بيانات SALIH USER

    const { data: profile, error: profileError } =

      await supabase
      .from("users")
      .select("*")
      .eq(
        "auth_user_id",
        user.id
      )
      .single();



    if (profileError || !profile) {

      return res.status(404).json({
        error:"USER_PROFILE_NOT_FOUND"
      });

    }



    req.user = profile;


    next();



  }

  catch(error){

    console.error(
      "AUTH ERROR:",
      error.message
    );


    res.status(500).json({
      error:"AUTH_FAILED"
    });

  }

}