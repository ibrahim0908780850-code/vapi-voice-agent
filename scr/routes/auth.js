import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { authenticateLogin } from "../../server/lib/loginService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const result = await authenticateLogin(getSupabase(), req.body, (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" }));
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("AUTH LOGIN ERROR:", error);
    return res.status(500).json({ error: "server_error", message: "تعذر تسجيل الدخول حالياً" });
  }
});

router.get("/me", (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: "missing_token" });
    const token = authorization.split(" ")[1];
    return res.json({ user: jwt.verify(token, process.env.JWT_SECRET) });
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
});

router.post("/logout", (_req, res) => res.json({ success: true }));

export default router;
