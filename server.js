import dotenv from "dotenv";
dotenv.config();
import express from "express";

import cors from "cors";
import path from "path";
import wardrobeRoutes from "./routes/wardrobeRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static("public"));

app.use("/api/ai", aiRoutes);

app.use("/api/clothes", wardrobeRoutes);
// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server working fine" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});