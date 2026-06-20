import express from "express";

const app = express();

app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    message: "SALIH AI IS LIVE 🚀"
  });
});

app.get("/test", (req, res) => {
  res.send("TEST OK 🚀");
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("🔥 Server running on port", PORT);
});