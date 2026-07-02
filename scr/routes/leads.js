import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// GET LEADS
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// UPDATE STATUS
router.post("/status", async (req, res) => {
  const { id, status } = req.body;

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

export default router;