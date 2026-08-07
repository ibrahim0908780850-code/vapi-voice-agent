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
        error: "invalid_credentials"
      });
    }

    const authUser = authData.user;

    // =========================
    // GET USER
    // =========================

    const {
      data: user,
      error: userError
    } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "user_profile_not_found"
      });
    }

    // =========================
    // DETERMINE NEXT STEP
    // =========================

    let next_step = "dashboard";

    // مالك المنصة
    if (user.is_platform_owner === true) {

      next_step = "platform";

    }

    // لا يملك شركة
    else if (!user.tenant_id) {

      const { data: request } = await supabase
        .from("company_requests")
        .select("status")
        .eq("auth_user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request) {

        if (request.status === "pending") {
          next_step = "pending";
        }

        else if (request.status === "approved") {
          next_step = "dashboard";
        }

        else {
          next_step = "create_company";
        }

      } else {

        next_step = "create_company";

      }

    }

    // =========================
    // CREATE JWT
    // =========================

    const token = jwt.sign(
      {
        id: user.id,
        auth_user_id: user.auth_user_id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role,
        is_platform_owner: user.is_platform_owner
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.json({

      success: true,

      token,

      next_step,

      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role,
        is_platform_owner: user.is_platform_owner
      }

    });

  }

  catch (error) {

    console.error("AUTH LOGIN ERROR:", error);

    return res.status(500).json({
      error: "server_error",
      message: error.message
    });

  }

});

// =========================
// CURRENT USER
// =========================

router.get("/me", async (req, res) => {

  try {

    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({
        error: "missing_token"
      });
    }

    const token = auth.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    return res.json({
      user: decoded
    });

  }

  catch {

    return res.status(401).json({
      error: "invalid_token"
    });

  }

});

// =========================
// LOGOUT
// =========================

router.post("/logout", async (req, res) => {

  return res.json({
    success: true
  });

});

export default router;